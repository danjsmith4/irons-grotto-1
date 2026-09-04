import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { players } from '@/lib/db/schema';
import { asc, lt, sql } from 'drizzle-orm';
import { fetchPlayerDetails } from '@/app/player/data-sources/fetch-player-details/fetch-player-details';
import { syncPlayerAccountType } from '@/app/player/utils/sync-player-account-type';
import {
  isScheduledRequest,
  reportScheduledJobFailure,
} from '@/app/api/utils/scheduled-job';
import {
  refreshBatchSize,
  refreshStaleAfterHours,
  refreshTimeBudgetMs,
  templeRateLimitDelayMs,
} from '@/config/scheduled-jobs';

export const dynamic = 'force-dynamic';

// Pro's default. The loop's own budget stops well inside this — see
// `refreshTimeBudgetMs` for why it is not left to Vercel to terminate.
export const maxDuration = 300;

/**
 * Refreshes the stalest slice of the roster from TempleOSRS, WikiSync and
 * Discord.
 *
 * **Chunked, because it cannot not be.** TempleOSRS allows ~10 datapoint
 * requests a minute, so each player costs a 6 second pause plus the work
 * itself — roughly 12 seconds. Two hundred members is therefore about forty
 * minutes of wall clock, and no serverless function anywhere runs for forty
 * minutes. The previous version of this endpoint ignored that and looped the
 * entire roster in one request: it was never scheduled (nothing could have
 * completed it), had to be triggered by hand, and died at the function timeout
 * partway down the list, refreshing whoever happened to sort first and
 * silently abandoning the rest.
 *
 * So a run takes the players who have gone longest without an update, works
 * through as many as its clock allows, and leaves the rest for the next run.
 * Hourly, that refreshes every member about once a day.
 *
 * **Ordering by `updated_at` is what makes it self-healing.** A fixed
 * partition — a 24th of the roster per hour — loses a whole bucket whenever
 * its run fails, and nothing notices until someone compares timestamps. Here a
 * player who was missed is, by definition, staler than everyone else, so the
 * next run reaches for them first. No cursor to store, no bucket to get out of
 * step, and a backlog drains itself.
 */
export async function GET(request: NextRequest) {
  if (!isScheduledRequest(request)) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 },
    );
  }

  const startedAt = Date.now();

  // Overridable so the same endpoint can be driven harder by hand — a local
  // run against the production database has no function timeout to respect and
  // can drain a long backlog in one go.
  const limit =
    Number(request.nextUrl.searchParams.get('limit') ?? '') || refreshBatchSize;
  const budgetMs =
    Number(request.nextUrl.searchParams.get('budget_ms') ?? '') ||
    refreshTimeBudgetMs;

  const staleBefore = new Date(
    Date.now() - refreshStaleAfterHours * 60 * 60 * 1000,
  );

  try {
    const [{ backlog }] = await db
      .select({ backlog: sql<number>`count(*)::int` })
      .from(players)
      .where(lt(players.updatedAt, staleBefore));

    const batch = await db
      .select({
        playerName: players.playerName,
        discordUserId: players.discordUserId,
        accountType: players.accountType,
        updatedAt: players.updatedAt,
      })
      .from(players)
      .where(lt(players.updatedAt, staleBefore))
      .orderBy(asc(players.updatedAt))
      .limit(limit);

    const failures: string[] = [];
    const playersNeedingAccountType: string[] = [];
    let processed = 0;
    let accountTypesResolved = 0;
    let stoppedForTime = false;

    for (const [index, player] of batch.entries()) {
      // Checked before the pause as well as before the work: there is no point
      // sleeping six seconds only to discover there is no time left to use it.
      if (Date.now() - startedAt > budgetMs) {
        stoppedForTime = true;
        break;
      }

      if (index > 0) {
        await new Promise((resolve) => {
          setTimeout(resolve, templeRateLimitDelayMs);
        });
      }

      try {
        // Game mode first, and independently of the heavy refresh below: it is
        // one cheap request, and populating it in a batch is what keeps the
        // account-type prompt off most players' screens.
        const accountTypeSync = await syncPlayerAccountType(
          player.playerName,
          player.accountType,
        );

        if (accountTypeSync.outcome === 'unresolved') {
          playersNeedingAccountType.push(player.playerName);
        } else if (accountTypeSync.outcome === 'updated') {
          accountTypesResolved += 1;
        }

        // Writes the record and, through `processPlayerData`, rescores it.
        const result = await fetchPlayerDetails(
          player.playerName,
          player.discordUserId,
        );

        if (result.success) {
          processed += 1;
        } else {
          failures.push(
            `${player.playerName}: ${typeof result.error === 'string' ? result.error : 'failed to fetch player details'}`,
          );
        }
      } catch (error) {
        failures.push(
          `${player.playerName}: ${error instanceof Error ? error.message : 'unknown error'}`,
        );
      }
    }

    // What a run is expected to look like is: some players refreshed, nobody
    // failed. Anything else is reported — including the case that looks like
    // success but is not, where there was a backlog and the run got through
    // none of it.
    const attempted = processed + failures.length;

    if (failures.length > 0) {
      await reportScheduledJobFailure(
        'Player refresh',
        `${failures.length} of ${attempted} players could not be refreshed. Their stats and points are unchanged until the next run picks them up.`,
        failures,
      );
    } else if (backlog > 0 && processed === 0) {
      await reportScheduledJobFailure(
        'Player refresh',
        `${backlog} players are overdue a refresh and this run updated none of them.`,
      );
    }

    return NextResponse.json({
      success: true,
      processed,
      failed: failures.length,
      // What the next run has left to do. A number that keeps climbing across
      // runs is the signal that the schedule is not keeping up with the roster.
      backlogBefore: backlog,
      backlogRemaining: Math.max(backlog - processed, 0),
      stoppedForTime,
      accountTypesResolved,
      playersNeedingAccountType,
      failures,
      durationMs: Date.now() - startedAt,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';

    console.error('Player refresh failed:', error);

    await reportScheduledJobFailure(
      'Player refresh',
      'The scheduled job that pulls fresh stats from TempleOSRS did not run. Member stats will not update until it next succeeds.',
      [message],
    );

    return NextResponse.json(
      { success: false, error: message },
      { status: 500 },
    );
  }
}
