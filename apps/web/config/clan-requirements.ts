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
 * ⚠️ **Hardcoded, deliberately, rather than derived from a ship date.** Members
 * were told this date; a deadline computed from `Date.now()` at deploy time
 * would move every time the app is redeployed, which is not a deadline. Ninety
 * days from the rule being agreed, 2026-08-30.
 */
export const totalLevelGraceDeadline = new Date('2026-11-28T00:00:00.000Z');
