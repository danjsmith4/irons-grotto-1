/**
 * The numbers behind the scheduled jobs, in one place so the schedule in
 * `vercel.json` and the code it invokes can be read against each other.
 */

/**
 * Where a scheduled job reports that it went wrong.
 *
 * The duty channel rather than a member-facing one: a failed refresh is a
 * staff problem, and members seeing "sync failed" every time TempleOSRS has a
 * bad morning teaches them to distrust the numbers rather than to do anything.
 */
export { clanEventDutyChannelId as scheduledJobAlertChannelId } from './clan-events';

/**
 * How long a refresh run may spend before it stops and leaves the rest for the
 * next one.
 *
 * Vercel terminates a function at `maxDuration` with a 504 and no body, which
 * is the least useful possible failure: you cannot tell a timeout from a crash
 * and you have no idea how far it got. So the loop watches the clock and stops
 * itself with room to spare, reporting what it managed. The job is then
 * structurally incapable of "getting too big" — a longer roster means more runs,
 * not a failed one.
 *
 * 240s inside the route's 300s ceiling, which on the Hobby plan is the maximum
 * as well as the default — there is no headroom to buy, so a run must never be
 * relying on the clock to finish.
 *
 * ⚠️ This is the **backstop, not the limit**. `refreshBatchSize` is what
 * decides how much a healthy run does; if a run ever reports `stoppedForTime`
 * it means players were much slower than expected, and that is a signal rather
 * than business as usual.
 */
export const refreshTimeBudgetMs = 240_000;

/**
 * The `sync_metadata` keys the two jobs claim their leases under, and how long
 * a lease is held for.
 *
 * Comfortably longer than a healthy run so the lease outlives the work, and
 * comfortably shorter than the hourly schedule so a crashed run costs at most
 * one window rather than blocking the next.
 */
export const refreshJobId = 'player-refresh';
export const reconcileJobId = 'points-reconcile';
export const jobLeaseSeconds = 600;

/**
 * How often the "these records could not be scored" alert may repeat.
 *
 * The condition it describes is persistent — a record stays unscorable until
 * someone fixes it — so on an hourly job the same names would post every hour
 * forever. That is not a louder alert, it is a channel people learn to skip.
 * The same lease primitive, used as a rate limiter rather than a mutex.
 */
export const reconcileSkipAlertJobId = 'points-reconcile-skip-alert';
export const skipAlertIntervalSeconds = 86_400;

/**
 * The pause between players, set by TempleOSRS' ~10 requests/minute limit on
 * the datapoint endpoints.
 *
 * This is the floor on how fast the roster can be refreshed and the reason the
 * work is chunked at all.
 */
export const templeRateLimitDelayMs = 6_000;

/**
 * How stale a record has to be before a refresh run will pick it up.
 *
 * A day, matching the cadence `refreshBatchSize` sustains. Once the roster is
 * current, runs find little to do and cost close to nothing.
 */
export const refreshStaleAfterHours = 24;

/**
 * How many players one run refreshes.
 *
 * **This is the limit that matters**, not the time budget. A fixed, small
 * batch makes every run the same predictable ~2 minutes and keeps it nowhere
 * near the 300s ceiling, which is worth more than draining a backlog quickly:
 * on Hobby that ceiling cannot be raised, so a run that only *usually* fits is
 * a run that eventually 504s and reports nothing.
 *
 * The arithmetic, at ~12s per player against 202 members: 10 an hour is 240 a
 * day, so everyone is refreshed daily with about 19% slack for failures and
 * skipped runs. Halving it to 5 still works and stretches the cycle to ~40h;
 * raising it buys a faster catch-up at the cost of that margin.
 */
export const refreshBatchSize = 10;
