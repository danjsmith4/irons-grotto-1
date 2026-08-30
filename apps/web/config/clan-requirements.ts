/**
 * What the clan asks of an account before it will take it on.
 *
 * One number and one date, kept here rather than beside the code that enforces
 * them, because they are a clan decision rather than an implementation detail —
 * the same reason `ranks.ts` holds the rank thresholds. The rules that read them
 * live in `app/join/utils/resolve-total-level-state.ts` (the door) and
 * `app/utils/resolve-total-level-grace.ts` (the members who were already here).
 */

/**
 * The floor for a new signup.
 *
 * ⚠️ **Not `minimumTotalLevel`** (`app/schemas/osrs.ts`), which is the *game's*
 * floor — the total level of an account that has never trained anything — and
 * is used to bound the calculator's own input. This is a clan rule and moves
 * independently of it.
 */
export const minimumJoinTotalLevel = 1500;

/**
 * How long members who were already here have to reach it.
 *
 * The end of the year: they have the rest of 2026, and the requirement applies
 * to everybody from the first day of 2027.
 *
 * ⚠️ **Hardcoded, deliberately, rather than derived from a ship date.** Members
 * were told this date, and a deadline computed from `Date.now()` at deploy time
 * would move every time the app is redeployed, which is not a deadline.
 */
export const totalLevelGraceDeadline = new Date('2027-01-01T00:00:00.000Z');
