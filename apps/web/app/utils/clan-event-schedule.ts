/**
 * When a clan event runs.
 *
 * Every SOTW/BOTW starts on a Friday at 14:00 UTC and ends on the following
 * Friday at 10:00 UTC — a fixed slot, not a moderator's choice, which is why
 * the create form shows these dates rather than offering them. Pure and
 * spec'd: nothing here reads the clock or the database on its own.
 */

/** `Date#getUTCDay()` for Friday. */
export const eventStartWeekday = 5;

export const eventStartHourUtc = 14;

export const eventEndHourUtc = 10;

/** Friday 14:00 → the *next* Friday 10:00. */
export const eventLengthDays = 7;

export interface ClanEventWindow {
  startsAt: Date;
  endsAt: Date;
}

/** The end of the slot that starts at `startsAt`. */
export function eventWindowEnd(startsAt: Date): Date {
  const endsAt = new Date(startsAt);

  endsAt.setUTCDate(endsAt.getUTCDate() + eventLengthDays);
  endsAt.setUTCHours(eventEndHourUtc, 0, 0, 0);

  return endsAt;
}

/**
 * The next slot a new event may occupy.
 *
 * `latestStart` is the start of the most recently scheduled event, which stops
 * a second event being created into the same Friday: the answer is always the
 * first Friday 14:00 UTC strictly after *both* now and that start. Passing
 * `null` (nothing recorded yet) simply falls back to now.
 */
export function nextClanEventWindow(
  now: Date,
  latestStart: Date | null,
): ClanEventWindow {
  const anchor =
    latestStart && latestStart.getTime() > now.getTime() ? latestStart : now;

  const startsAt = new Date(
    Date.UTC(
      anchor.getUTCFullYear(),
      anchor.getUTCMonth(),
      anchor.getUTCDate(),
      eventStartHourUtc,
      0,
      0,
      0,
    ),
  );

  const daysUntilFriday = (eventStartWeekday - startsAt.getUTCDay() + 7) % 7;

  startsAt.setUTCDate(startsAt.getUTCDate() + daysUntilFriday);

  // Landing on today's Friday only counts if 14:00 has not already passed —
  // an event cannot start in the past.
  if (startsAt.getTime() <= anchor.getTime()) {
    startsAt.setUTCDate(startsAt.getUTCDate() + eventLengthDays);
  }

  return { startsAt, endsAt: eventWindowEnd(startsAt) };
}

/** Where an event sits relative to now. */
export type ClanEventPhase = 'upcoming' | 'active' | 'finished';

export function clanEventPhase(
  { startsAt, endsAt }: ClanEventWindow,
  now: Date,
): ClanEventPhase {
  if (now.getTime() < startsAt.getTime()) {
    return 'upcoming';
  }

  return now.getTime() < endsAt.getTime() ? 'active' : 'finished';
}

/**
 * The one-ahead rule: an event may be created only when nothing is already
 * queued behind the one running.
 *
 * The authoritative check is a query — `getUpcomingClanEvent` — because the
 * form is looking at a copy of the queue that may be minutes old. This is the
 * same rule applied to a list already in hand, for deciding what to draw.
 */
export function canScheduleClanEvent(
  events: ClanEventWindow[],
  now: Date,
): boolean {
  return !events.some((event) => clanEventPhase(event, now) === 'upcoming');
}
