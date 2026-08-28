/**
 * Maggot King Speed Chaser — the Grandmaster combat achievement.
 *
 * "Complete the first 5 kills of the Maggot King within 9 minutes after
 * entering the arena." Only time spent fighting the boss counts, so what has to
 * come in under the budget is the sum of the five fight durations, not the wall
 * clock — which is why this takes kill times rather than a running timer.
 *
 * Everything here is integer game ticks. A tick is 600ms, so every duration the
 * game can produce is a whole number of them; doing the arithmetic in ticks
 * keeps a five-kill sum exact, where repeatedly adding 0.6 seconds does not.
 * Ticks are converted to a display string only at the edge, in `formatTicks`.
 */

/** A game tick, in deciseconds. Ticks are 600ms, so six tenths of a second. */
export const decisecondsPerTick = 6;

/** 9 minutes: 540 seconds, 900 ticks. */
export const speedChaserBudgetTicks = 900;

/** The task counts the first five kills of the instance, and only those. */
export const speedChaserKillCount = 5;

/**
 * The flat pace: the budget split evenly, 1:48.0 per kill. Not a rule — a kill
 * may run long and be paid back by a fast one — but it is the line every kill
 * is measured against, so it is worth naming.
 */
export const flatPaceTicks = speedChaserBudgetTicks / speedChaserKillCount;

/** Anything longer than this is a typo, not a kill. */
const maximumKillTicks = 3000;

export interface ParsedKillTime {
  /** Ticks, snapped to the nearest whole one. Null when blank or unparseable. */
  ticks: number | null;
  /** Set only when the text was present and wrong — a blank field is not an error. */
  error: string | null;
}

/**
 * Formats ticks as `mm:ss.t`.
 *
 * The tenths digit is the tick remainder inside the second: a tick is 0.6s, so
 * the fraction only ever lands on .0/.2/.4/.6/.8. Computed in deciseconds so no
 * floating point is involved. Minutes are padded to two digits — these numbers
 * sit in mono columns and have to line up.
 */
export function formatTicks(ticks: number): string {
  const sign = ticks < 0 ? '-' : '';
  const deciseconds = Math.abs(Math.trunc(ticks)) * decisecondsPerTick;
  const minutes = Math.floor(deciseconds / 600);
  const seconds = Math.floor(deciseconds / 10) % 60;
  const tenths = deciseconds % 10;

  return `${sign}${String(minutes).padStart(2, '0')}:${String(seconds).padStart(
    2,
    '0',
  )}.${tenths}`;
}

/** Same format, but always signed — for "banked" and per-kill pace deltas. */
export function formatTickDelta(ticks: number): string {
  return ticks < 0 ? formatTicks(ticks) : `+${formatTicks(ticks)}`;
}

/**
 * Reads a kill time the way a player would type one off the chat message:
 * `1:42.60`, `1:42.6`, `1:42`, `102.6`, `102`, and `1:42:6` (the third segment
 * read as the fraction, since that is how the achievement's times are written).
 *
 * The result is snapped to the nearest tick, so a time that could not have come
 * from the game is corrected rather than rejected — and the snapped value is
 * echoed back so the player sees what was scored.
 */
export function parseKillTime(input: string): ParsedKillTime {
  const trimmed = input.trim().replace(',', '.');

  if (!trimmed) {
    return { ticks: null, error: null };
  }

  const segments = trimmed.split(':');

  if (segments.length > 3) {
    return { ticks: null, error: 'Use m:ss.t' };
  }

  const [minutesText, secondsText] = ((): [string, string] => {
    if (segments.length === 3) {
      return [segments[0], `${segments[1]}.${segments[2]}`];
    }

    if (segments.length === 2) {
      return [segments[0], segments[1]];
    }

    return ['0', segments[0]];
  })();

  if (!/^\d{1,3}$/.test(minutesText) || !/^\d+(\.\d{1,3})?$/.test(secondsText)) {
    return { ticks: null, error: 'Use m:ss.t' };
  }

  const seconds = Number(secondsText);

  if (segments.length > 1 && seconds >= 60) {
    return { ticks: null, error: 'Seconds must be under 60' };
  }

  const deciseconds = Math.round((Number(minutesText) * 60 + seconds) * 10);
  const ticks = Math.round(deciseconds / decisecondsPerTick);

  if (ticks < 1) {
    return { ticks: null, error: 'A kill takes at least one tick' };
  }

  if (ticks > maximumKillTicks) {
    return { ticks: null, error: 'That is longer than the whole attempt' };
  }

  return { ticks, error: null };
}

export type SpeedChaserStatus =
  | 'not-started'
  | 'on-track'
  | 'at-risk'
  | 'failed'
  | 'complete';

export interface SpeedChaserSummary {
  killsLogged: number;
  killsRemaining: number;
  /** Sum of the logged kills. */
  elapsedTicks: number;
  /** Budget minus elapsed. Negative once the attempt has overrun. */
  remainingTicks: number;
  /**
   * The most each remaining kill may take. Floored: a fractional tick is not a
   * thing the game can give you, so the honest ceiling is the whole tick below.
   * Null once all five are logged.
   */
  requiredAverageTicks: number | null;
  /** Mean of the kills logged so far. Null before the first one. */
  averageKillTicks: number | null;
  /**
   * Time in hand against the flat 1:48.0 pace. Positive is banked, negative is
   * owed. This is the number that says whether the attempt is still comfortable.
   */
  bankedTicks: number;
  /** Where the attempt lands if the remaining kills match the average so far. */
  projectedTicks: number | null;
  status: SpeedChaserStatus;
}

/**
 * Scores an attempt from the kill times entered so far. Blanks are simply kills
 * that have not happened yet.
 *
 * The budget is inclusive — a dead-on 09:00.0 passes.
 */
export function summariseAttempt(
  killTicks: readonly (number | null)[],
): SpeedChaserSummary {
  const logged = killTicks.filter((ticks): ticks is number => ticks !== null);
  const killsLogged = logged.length;
  const killsRemaining = Math.max(0, speedChaserKillCount - killsLogged);
  const elapsedTicks = logged.reduce((total, ticks) => total + ticks, 0);
  const remainingTicks = speedChaserBudgetTicks - elapsedTicks;

  const status = ((): SpeedChaserStatus => {
    // Over budget, or short of the one tick the next kill would need at minimum.
    if (remainingTicks < 0 || (killsRemaining > 0 && remainingTicks < 1)) {
      return 'failed';
    }

    if (killsLogged === 0) {
      return 'not-started';
    }

    if (killsRemaining === 0) {
      return 'complete';
    }

    return elapsedTicks > killsLogged * flatPaceTicks ? 'at-risk' : 'on-track';
  })();

  return {
    killsLogged,
    killsRemaining,
    elapsedTicks,
    remainingTicks,
    requiredAverageTicks:
      killsRemaining > 0 ? Math.floor(remainingTicks / killsRemaining) : null,
    averageKillTicks:
      killsLogged > 0 ? Math.round(elapsedTicks / killsLogged) : null,
    bankedTicks: killsLogged * flatPaceTicks - elapsedTicks,
    projectedTicks:
      killsLogged > 0
        ? elapsedTicks + Math.round((elapsedTicks * killsRemaining) / killsLogged)
        : null,
    status,
  };
}
