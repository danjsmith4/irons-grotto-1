import 'server-only';
import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { syncMetadata } from '@/lib/db/schema';
import { eq, sql } from 'drizzle-orm';
import { sendDiscordMessage } from '@/app/player/utils/send-discord-message';
import { scheduledJobAlertChannelId } from '@/config/scheduled-jobs';

/**
 * Whether a request is genuinely the scheduler.
 *
 * Vercel sends `Authorization: Bearer $CRON_SECRET` on every cron invocation
 * when that environment variable is set. These endpoints move real data and
 * spend a rate-limited third-party budget, so they must not be a URL anyone
 * can hit repeatedly.
 *
 * ⚠️ **With no `CRON_SECRET` set, this returns false and the endpoints refuse
 * to run.** Failing closed is deliberate: an unset secret is indistinguishable
 * from a misconfigured deploy, and the failure mode of guessing wrong is a
 * public endpoint that hammers TempleOSRS. Set `CRON_SECRET` in the Vercel
 * project before enabling the crons.
 */
export function isScheduledRequest(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;

  if (!secret) {
    return false;
  }

  return request.headers.get('authorization') === `Bearer ${secret}`;
}

/**
 * Stops two triggers running the same job at once.
 *
 * There are two schedulers — the hourly GitHub Actions workflow and the daily
 * `vercel.json` backstop — and once a day they land near each other. That
 * matters more than it looks: the refresh picks the players with the oldest
 * `updated_at`, so a second run starting alongside the first selects **the same
 * players**, which the first has not finished updating yet, and spends
 * TempleOSRS' ~10 requests/minute twice over the same work.
 *
 * Claimed by the same atomic conditional upsert `maybeRunInactivitySync` uses
 * (`lib/db/inactivity-sync.ts`): the update only fires when the existing lease
 * has expired, so two simultaneous callers cannot both come back with a row.
 *
 * ⚠️ **The lease expires rather than being a flag.** A run killed mid-flight —
 * a 504, a deploy, a crash — never reaches its release, and a boolean would
 * wedge the job until somebody noticed. An expiry means the worst case is one
 * skipped window.
 */
export async function claimJobLease(
  jobId: string,
  leaseSeconds: number,
): Promise<boolean> {
  try {
    const claimed = await db
      .insert(syncMetadata)
      .values({ id: jobId, lastRunAt: new Date() })
      .onConflictDoUpdate({
        target: syncMetadata.id,
        set: { lastRunAt: new Date() },
        setWhere: sql`${syncMetadata.lastRunAt} < now() - make_interval(secs => ${leaseSeconds})`,
      })
      .returning({ id: syncMetadata.id });

    return claimed.length > 0;
  } catch (error) {
    // Never block the job on the lock failing. Missing the lease risks a
    // duplicated run, which wastes rate limit; refusing to run because the
    // lease could not be read means the data simply stops updating, which is
    // the thing this whole subsystem exists to prevent.
    console.error(`Could not claim the ${jobId} lease, running anyway:`, error);

    return true;
  }
}

/**
 * Releases a lease early, so the next scheduled run is not made to wait out an
 * expiry that no longer describes anything.
 *
 * Backdates rather than deletes: the row is also the record of when the job
 * last ran, and other code reads `sync_metadata` for exactly that.
 */
export async function releaseJobLease(
  jobId: string,
  leaseSeconds: number,
): Promise<void> {
  try {
    await db
      .update(syncMetadata)
      .set({
        lastRunAt: sql`now() - make_interval(secs => ${leaseSeconds})`,
      })
      .where(eq(syncMetadata.id, jobId));
  } catch (error) {
    console.error(`Could not release the ${jobId} lease:`, error);
  }
}

/**
 * Tells staff that a scheduled job needs looking at.
 *
 * Never throws. This is the reporting path for something that has already gone
 * wrong, and a failure to report must not become a second, louder failure that
 * takes down the handler trying to describe the first one.
 */
export async function reportScheduledJobFailure(
  jobName: string,
  summary: string,
  details: string[] = [],
): Promise<void> {
  const body = [
    `⚠️ **${jobName}** needs attention.`,
    summary,
    // Discord rejects a message over 2000 characters, and a run that failed for
    // every player would comfortably exceed that. The count is the signal; the
    // names are a sample.
    ...details.slice(0, 10).map((detail) => `• ${detail}`),
    ...(details.length > 10 ? [`• …and ${details.length - 10} more`] : []),
  ].join('\n');

  try {
    await sendDiscordMessage({ content: body }, scheduledJobAlertChannelId);
  } catch (error) {
    console.error(`Could not report ${jobName} failure to Discord:`, error);
  }
}
