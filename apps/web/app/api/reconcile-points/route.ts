import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { playerAcquiredItems, players } from '@/lib/db/schema';
import { eq, sql } from 'drizzle-orm';
import { unscorableReason } from '@/app/utils/is-record-scorable';
import {
  buildScoringItemList,
  scorePlayersFromRecords,
} from '@/app/data-sources/score-players-from-record';
import {
  isScheduledRequest,
  reportScheduledJobFailure,
} from '@/app/api/utils/scheduled-job';

export const dynamic = 'force-dynamic';

/**
 * Brings `players.points` back in line with what the stored record scores to.
 *
 * Cheap enough to do for everyone, every time: scoring reads only Postgres,
 * and the one expensive input — the notable item list, built from live wiki
 * drop rates — is built once and shared by every player. The whole roster
 * takes a couple of seconds.
 *
 * This is a safety net, not the mechanism. `processPlayerData` writes the
 * correct total whenever a player is synced; this catches the totals that go
 * stale between syncs — an autosaved item override, a change to the point
 * config, a sync whose scoring step failed and kept the previous value. Before
 * it existed those simply stayed wrong, and 84 of 136 active members were
 * carrying an understated total, some by more than 1,500 points.
 *
 * It deliberately does **not** touch `players.rank`. A rank is granted by a
 * moderator through `approveSubmission`, and a job that quietly moved people up
 * the ladder overnight would be assigning real in-game and Discord standing
 * with nobody deciding to.
 */
export async function GET(request: NextRequest) {
  if (!isScheduledRequest(request)) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 },
    );
  }

  const startedAt = Date.now();

  try {
    const roster = await db.select().from(players);
    const notableItemList = await buildScoringItemList();
    const breakdowns = await scorePlayersFromRecords(roster, notableItemList);

    // One grouped count rather than a query per player: this is only needed to
    // tell "no collection log rows" from "some", which is the whole guard.
    const clogRowCounts = await db
      .select({
        playerName: playerAcquiredItems.playerName,
        rows: sql<number>`count(*)::int`,
      })
      .from(playerAcquiredItems)
      .groupBy(playerAcquiredItems.playerName);

    const rowsByPlayer = new Map(
      clogRowCounts.map(({ playerName, rows }) => [playerName, rows]),
    );

    const skipped: { playerName: string; reason: string }[] = [];

    const drifted = roster.flatMap((player) => {
      const breakdown = breakdowns[player.playerName];

      if (!breakdown) {
        return [];
      }

      // A record that cannot be scored faithfully keeps whatever it has. See
      // `unscorableReason` — publishing a number derived from a half-written
      // record is worse than leaving a stale one in place.
      const reason = unscorableReason({
        totalLevel: player.totalLevel,
        totalXp: player.totalXp,
        collectionLogCount: player.collectionLogCount,
        storedCollectionLogRows: rowsByPlayer.get(player.playerName) ?? 0,
      });

      if (reason) {
        skipped.push({ playerName: player.playerName, reason });

        return [];
      }

      const stored = Math.round(player.points);
      const scored = breakdown.totalPoints;

      return scored === stored
        ? []
        : [{ playerName: player.playerName, stored, scored }];
    });

    // Sequential rather than a Promise.all: this runs at most a few hundred
    // single-row updates on a schedule nobody is waiting for, and a burst of
    // parallel writes against a pooled Neon connection is a worse trade than
    // taking an extra second.
    for (const { playerName, scored } of drifted) {
      await db
        .update(players)
        .set({ points: scored, updatedAt: new Date() })
        .where(eq(players.playerName, playerName));
    }

    const biggest = [...drifted]
      .sort(
        (a, b) => Math.abs(b.scored - b.stored) - Math.abs(a.scored - a.stored),
      )
      .slice(0, 5)
      .map(
        ({ playerName, stored, scored }) =>
          `${playerName}: ${stored} → ${scored}`,
      );

    // Skips are reported rather than logged and forgotten: each one is a record
    // that needs a person, and a count that grows run over run is the signal
    // that renames are stranding collection log rows again.
    if (skipped.length > 0) {
      await reportScheduledJobFailure(
        'Points reconciliation',
        `${skipped.length} record(s) could not be scored and kept their stored total.`,
        skipped.map(({ playerName, reason }) => `${playerName} (${reason})`),
      );
    }

    return NextResponse.json({
      success: true,
      playersChecked: roster.length,
      playersCorrected: drifted.length,
      playersSkipped: skipped,
      biggestCorrections: biggest,
      durationMs: Date.now() - startedAt,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';

    console.error('Points reconciliation failed:', error);

    await reportScheduledJobFailure(
      'Points reconciliation',
      'The nightly job that keeps leaderboard totals in step with the stored records did not finish. Totals will be stale until it next succeeds.',
      [message],
    );

    return NextResponse.json(
      { success: false, error: message },
      { status: 500 },
    );
  }
}
