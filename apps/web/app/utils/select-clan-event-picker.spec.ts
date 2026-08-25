import {
  selectClanEventPicker,
  type ClanEventPickerCandidate,
} from './select-clan-event-picker';

const utc = (iso: string) => new Date(`${iso}Z`);

const now = utc('2026-08-25T06:00:00');

function event({
  winner,
  ...overrides
}: Partial<Omit<ClanEventPickerCandidate, 'winner'>> &
  Pick<ClanEventPickerCandidate, 'type' | 'startsAt'> & {
    winner?: { playerName: string; isActiveMember?: boolean } | null;
  }): ClanEventPickerCandidate {
  const endsAt = new Date(overrides.startsAt);

  endsAt.setUTCDate(endsAt.getUTCDate() + 7);

  return {
    name: `${overrides.type} event`,
    endsAt,
    ...overrides,
    winner:
      winner === undefined
        ? { playerName: 'Someone', gained: 1, isActiveMember: true }
        : winner && {
            playerName: winner.playerName,
            gained: 1,
            isActiveMember: winner.isActiveMember ?? true,
          },
  };
}

describe('selectClanEventPicker', () => {
  /**
   * The rule that was got wrong first time round: a boss week's boss is chosen
   * by whoever won the previous *boss* week, not by whoever won most recently.
   */
  it('picks the last winner of the same event type, not the most recent winner', () => {
    const events = [
      event({
        type: 'sotw',
        startsAt: utc('2026-08-07T14:00:00'),
        name: 'Runecraft SOTW',
        winner: { playerName: 'Skiller' },
      }),
      event({
        type: 'botw',
        startsAt: utc('2026-07-10T02:00:00'),
        name: 'Maggot King BOTW',
        winner: { playerName: 'The Victory' },
      }),
    ];

    expect(selectClanEventPicker(events, 'botw', now).winner).toEqual({
      playerName: 'The Victory',
      eventName: 'Maggot King BOTW',
      isActiveMember: true,
    });

    expect(selectClanEventPicker(events, 'sotw', now).winner?.playerName).toBe(
      'Skiller',
    );
  });

  it('takes the most recent of several events of that type', () => {
    const events = [
      event({
        type: 'botw',
        startsAt: utc('2026-06-05T14:00:00'),
        winner: { playerName: 'Older' },
      }),
      event({
        type: 'botw',
        startsAt: utc('2026-07-10T02:00:00'),
        winner: { playerName: 'Newer' },
      }),
    ];

    expect(selectClanEventPicker(events, 'botw', now).winner?.playerName).toBe(
      'Newer',
    );
  });

  /**
   * The event running now is always the *other* type (the two alternate), so
   * it is never the one being asked about — but guard the ordering anyway,
   * since an unfinished event has no winner to offer.
   */
  it('ignores an event that has not finished', () => {
    const events = [
      event({
        type: 'botw',
        startsAt: utc('2026-08-21T14:00:00'),
        name: 'Running BOTW',
        winner: null,
      }),
      event({
        type: 'botw',
        startsAt: utc('2026-07-10T02:00:00'),
        name: 'Finished BOTW',
        winner: { playerName: 'The Victory' },
      }),
    ];

    expect(selectClanEventPicker(events, 'botw', now).winner?.eventName).toBe(
      'Finished BOTW',
    );
  });

  it('skips a finished event whose winner was never recorded', () => {
    const events = [
      event({
        type: 'botw',
        startsAt: utc('2026-08-01T14:00:00'),
        name: 'Unrecorded BOTW',
        winner: null,
      }),
      event({
        type: 'botw',
        startsAt: utc('2026-07-10T02:00:00'),
        name: 'Maggot King BOTW',
        winner: { playerName: 'The Victory' },
      }),
    ];

    expect(selectClanEventPicker(events, 'botw', now).winner?.eventName).toBe(
      'Maggot King BOTW',
    );
  });

  describe('when the winner has left the clan', () => {
    const departed = event({
      type: 'botw',
      startsAt: utc('2026-07-10T02:00:00'),
      name: 'Maggot King BOTW',
      winner: { playerName: 'The Victory', isActiveMember: false },
    });

    /**
     * Reported rather than skipped: quietly substituting the next name would
     * leave a moderator unable to tell a stand-in from the rule's real answer.
     */
    it('still names them, flagged, rather than silently skipping them', () => {
      const result = selectClanEventPicker([departed], 'botw', now);

      expect(result.winner).toEqual({
        playerName: 'The Victory',
        eventName: 'Maggot King BOTW',
        isActiveMember: false,
      });
    });

    it('offers the most recent past winner who is still in the clan', () => {
      const events = [
        departed,
        event({
          type: 'botw',
          startsAt: utc('2026-06-05T14:00:00'),
          name: 'Vorkath BOTW',
          winner: { playerName: 'Still Here' },
        }),
        event({
          type: 'botw',
          startsAt: utc('2026-05-01T14:00:00'),
          name: 'Zulrah BOTW',
          winner: { playerName: 'Older Still' },
        }),
      ];

      expect(selectClanEventPicker(events, 'botw', now).standIn).toEqual({
        playerName: 'Still Here',
        eventName: 'Vorkath BOTW',
        isActiveMember: true,
      });
    });

    it('has no stand-in when every past winner of that type has left', () => {
      const events = [
        departed,
        event({
          type: 'botw',
          startsAt: utc('2026-06-05T14:00:00'),
          winner: { playerName: 'Also Gone', isActiveMember: false },
        }),
      ];

      expect(selectClanEventPicker(events, 'botw', now).standIn).toBeNull();
    });

    it('does not reach into the other event type for a stand-in', () => {
      const events = [
        departed,
        event({
          type: 'sotw',
          startsAt: utc('2026-08-07T14:00:00'),
          winner: { playerName: 'Skiller' },
        }),
      ];

      expect(selectClanEventPicker(events, 'botw', now).standIn).toBeNull();
    });
  });

  it('offers no stand-in when the winner is still here', () => {
    const events = [
      event({
        type: 'botw',
        startsAt: utc('2026-07-10T02:00:00'),
        winner: { playerName: 'The Victory' },
      }),
      event({
        type: 'botw',
        startsAt: utc('2026-06-05T14:00:00'),
        winner: { playerName: 'Someone Else' },
      }),
    ];

    expect(selectClanEventPicker(events, 'botw', now).standIn).toBeNull();
  });

  it('returns nothing when no event of that type has ever been won', () => {
    const events = [
      event({ type: 'sotw', startsAt: utc('2026-08-07T14:00:00') }),
    ];

    expect(selectClanEventPicker(events, 'botw', now)).toEqual({
      winner: null,
      standIn: null,
    });
  });

  it('returns nothing from nothing at all', () => {
    expect(selectClanEventPicker([], 'sotw', now)).toEqual({
      winner: null,
      standIn: null,
    });
  });
});
