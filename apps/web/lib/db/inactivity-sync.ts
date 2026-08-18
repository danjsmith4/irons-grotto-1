import { differenceInDays } from 'date-fns';
import { inArray } from 'drizzle-orm';
import { sql } from 'drizzle-orm/sql/sql';
import * as Sentry from '@sentry/nextjs';
import { clientConstants } from '@/config/constants.client';
import { serverConstants } from '@/config/constants.server';
import { GroupMemberInfoResponse } from '@/app/schemas/temple-api';
import { db } from './index';
import { players, syncMetadata } from './schema';

const INACTIVITY_SYNC_JOB_ID = 'inactivity-reconcile';

// A player with no XP gain on TempleOSRS for longer than this is treated as
// having left the clan and is hidden from the leaderboard (soft delete).
export const INACTIVITY_THRESHOLD_DAYS = 90;

/**
 * OSRS display names can arrive with underscores, regular spaces or
 * non-breaking spaces depending on the source. Normalise before comparing the
 * Temple memberlist against our stored player names.
 */
function normaliseName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[\s_]+/g, ' ')
    .trim();
}

async function fetchTempleMemberInfo(): Promise<GroupMemberInfoResponse> {
  const response = await fetch(
    `${clientConstants.temple.baseUrl}/api/group_member_info.php?id=${serverConstants.temple.groupId}`,
  );

  return GroupMemberInfoResponse.parse(await response.json());
}

type ReconcileResult =
  | { skipped: true }
  | { skipped: false; deactivated: number; reactivated: number };

/**
 * Reconciles the `is_active` flag on every stored player against TempleOSRS
 * activity. This runs in both directions (self-healing):
 *   - active players who are inactive beyond the threshold (or no longer in the
 *     Temple group) are soft-deleted (`is_active = false`);
 *   - previously soft-deleted players who have become active again are restored.
 *
 * If the Temple response is empty (API blip) the reconcile is skipped so we
 * never mass-deactivate the whole leaderboard on bad data.
 */
export async function reconcileInactivePlayers(): Promise<ReconcileResult> {
  const memberInfo = await fetchTempleMemberInfo();
  const memberlist = Object.values(memberInfo.data.memberlist);

  if (memberlist.length === 0) {
    return { skipped: true };
  }

  // Normalised rsn -> days since last XP gain (Temple reports unix seconds).
  const daysInactiveByPlayer = new Map<string, number>();
  memberlist.forEach(({ player, last_changed_xp_unix_time: lastXpUnix }) => {
    daysInactiveByPlayer.set(
      normaliseName(player),
      differenceInDays(Date.now(), lastXpUnix * 1000),
    );
  });

  const storedPlayers = await db
    .select({ playerName: players.playerName, isActive: players.isActive })
    .from(players);

  const toDeactivate: string[] = [];
  const toReactivate: string[] = [];

  storedPlayers.forEach(({ playerName, isActive }) => {
    const daysInactive = daysInactiveByPlayer.get(normaliseName(playerName));

    // Absent from the Temple group (left the clan) or inactive beyond the
    // threshold => should be hidden. Present and recently active => visible.
    const shouldBeInactive =
      daysInactive === undefined ||
      daysInactive > INACTIVITY_THRESHOLD_DAYS;

    if (shouldBeInactive && isActive) {
      toDeactivate.push(playerName);
    } else if (!shouldBeInactive && !isActive) {
      toReactivate.push(playerName);
    }
  });

  if (toDeactivate.length > 0) {
    await db
      .update(players)
      .set({ isActive: false, updatedAt: new Date() })
      .where(inArray(players.playerName, toDeactivate));
  }

  if (toReactivate.length > 0) {
    await db
      .update(players)
      .set({ isActive: true, updatedAt: new Date() })
      .where(inArray(players.playerName, toReactivate));
  }

  return {
    skipped: false,
    deactivated: toDeactivate.length,
    reactivated: toReactivate.length,
  };
}

/**
 * Runs the inactivity reconcile at most once per 24h. There is no server cron,
 * so this is triggered by page traffic. The `sync_metadata` row is claimed
 * atomically via an upsert whose update only fires when the last run was over
 * 24h ago — so concurrent requests never double-run. Safe to call and forget
 * (e.g. via `after()`); all errors are captured, never surfaced to the page.
 */
export async function maybeRunInactivitySync(): Promise<void> {
  try {
    const claimed = await db
      .insert(syncMetadata)
      .values({ id: INACTIVITY_SYNC_JOB_ID, lastRunAt: new Date() })
      .onConflictDoUpdate({
        target: syncMetadata.id,
        set: { lastRunAt: new Date() },
        setWhere: sql`${syncMetadata.lastRunAt} < now() - interval '24 hours'`,
      })
      .returning({ id: syncMetadata.id });

    // Empty result => another request already claimed today's run, or the last
    // run was under 24h ago.
    if (claimed.length === 0) {
      return;
    }

    await reconcileInactivePlayers();
  } catch (error) {
    Sentry.captureException(error);
  }
}
