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
 * 240s inside the route's 300s ceiling. The margin covers one in-flight player
 * (the slowest observed is ~14s) plus the response.
 */
export const refreshTimeBudgetMs = 240_000;

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
 * Slightly under a day, so that an hourly schedule refreshes each member about
 * once daily without a run being able to pick the same player twice in a row
 * while others wait. Once the roster is current, runs find little to do and
 * cost close to nothing.
 */
export const refreshStaleAfterHours = 20;

/**
 * The most players one run will attempt, whatever the clock says.
 *
 * With an hourly schedule the roster only needs `total / 24` per run; this is
 * headroom for catching up after an outage, not the expected load. The time
 * budget is the real limit — this stops a single run monopolising TempleOSRS
 * if the budget is ever raised.
 */
export const refreshBatchSize = 25;
