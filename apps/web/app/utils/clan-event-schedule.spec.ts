import {
  canScheduleClanEvent,
  clanEventPhase,
  eventWindowEnd,
  nextClanEventWindow,
} from './clan-event-schedule';

/** Every SOTW/BOTW opens Friday 14:00 UTC and closes the next Friday 10:00. */
const utc = (iso: string) => new Date(`${iso}Z`);

describe('eventWindowEnd', () => {
  it('closes on the following Friday at 10:00 UTC', () => {
    expect(eventWindowEnd(utc('2026-08-21T14:00:00'))).toEqual(
      utc('2026-08-28T10:00:00'),
    );
  });
});

describe('nextClanEventWindow', () => {
  it('books the coming Friday when mid-week', () => {
    const { startsAt, endsAt } = nextClanEventWindow(
      utc('2026-08-25T06:00:00'), // Tuesday
      utc('2026-08-21T14:00:00'),
    );

    expect(startsAt).toEqual(utc('2026-08-28T14:00:00'));
    expect(endsAt).toEqual(utc('2026-09-04T10:00:00'));
  });

  it('still books today when Friday 14:00 has not passed', () => {
    const { startsAt } = nextClanEventWindow(
      utc('2026-08-28T09:00:00'),
      utc('2026-08-21T14:00:00'),
    );

    expect(startsAt).toEqual(utc('2026-08-28T14:00:00'));
  });

  it('skips to next week once Friday 14:00 has passed', () => {
    const { startsAt } = nextClanEventWindow(
      utc('2026-08-28T14:00:00'),
      utc('2026-08-21T14:00:00'),
    );

    expect(startsAt).toEqual(utc('2026-09-04T14:00:00'));
  });

  it('never lands on the same Friday as an event already scheduled', () => {
    // The queued event starts this coming Friday; the slot after it is the
    // week after, not the same day.
    const { startsAt } = nextClanEventWindow(
      utc('2026-08-25T06:00:00'),
      utc('2026-08-28T14:00:00'),
    );

    expect(startsAt).toEqual(utc('2026-09-04T14:00:00'));
  });

  it('works with no history at all', () => {
    const { startsAt } = nextClanEventWindow(utc('2026-08-25T06:00:00'), null);

    expect(startsAt).toEqual(utc('2026-08-28T14:00:00'));
  });
});

describe('clanEventPhase', () => {
  const event = {
    startsAt: utc('2026-08-21T14:00:00'),
    endsAt: utc('2026-08-28T10:00:00'),
  };

  it.each([
    ['2026-08-20T12:00:00', 'upcoming'],
    ['2026-08-21T14:00:00', 'active'],
    ['2026-08-25T00:00:00', 'active'],
    ['2026-08-28T10:00:00', 'finished'],
    ['2026-09-01T00:00:00', 'finished'],
  ])('is %s → %s', (now, expected) => {
    expect(clanEventPhase(event, utc(now))).toBe(expected);
  });
});

describe('canScheduleClanEvent', () => {
  const running = {
    startsAt: utc('2026-08-21T14:00:00'),
    endsAt: utc('2026-08-28T10:00:00'),
  };
  const queued = {
    startsAt: utc('2026-08-28T14:00:00'),
    endsAt: utc('2026-09-04T10:00:00'),
  };
  const now = utc('2026-08-25T06:00:00');

  it('allows one event queued beyond the one running', () => {
    expect(canScheduleClanEvent([running], now)).toBe(true);
  });

  it('blocks a second queued event', () => {
    expect(canScheduleClanEvent([running, queued], now)).toBe(false);
  });

  it('allows scheduling when everything has finished', () => {
    expect(canScheduleClanEvent([running], utc('2026-09-10T00:00:00'))).toBe(
      true,
    );
  });

  it('allows scheduling from nothing', () => {
    expect(canScheduleClanEvent([], now)).toBe(true);
  });
});
