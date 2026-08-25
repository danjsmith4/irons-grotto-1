import { buildEventDutyMessage } from './build-event-duty-message';
import type { ClanEventPickerResult } from './select-clan-event-picker';

const utc = (iso: string) => new Date(`${iso}Z`);

const base = {
  discordUserId: '123456789',
  type: 'botw' as const,
  startsAt: utc('2026-08-28T14:00:00'),
  adminUrl: 'https://irons-grotto.example/admin',
  now: utc('2026-08-25T14:00:00'),
};

const noPicker: ClanEventPickerResult = { winner: null, standIn: null };

describe('buildEventDutyMessage', () => {
  it('mentions the person so Discord actually pings them', () => {
    const message = buildEventDutyMessage({ ...base, picker: noPicker });

    expect(message).toContain('<@123456789>');
  });

  it('states the event type and the deadline in UTC', () => {
    const message = buildEventDutyMessage({ ...base, picker: noPicker });

    expect(message).toContain('Boss of the Week');
    expect(message).toContain('Friday 28 August at 14:00 UTC');
    expect(message).toContain('3 days');
  });

  it('links the admin dashboard', () => {
    const message = buildEventDutyMessage({ ...base, picker: noPicker });

    expect(message).toContain('https://irons-grotto.example/admin');
  });

  it('names the winner to ask for the pick', () => {
    const message = buildEventDutyMessage({
      ...base,
      picker: {
        winner: {
          playerName: 'The Victory',
          eventName: 'Maggot King BOTW',
          isActiveMember: true,
        },
        standIn: null,
      },
    });

    expect(message).toContain('The Victory');
    expect(message).toContain('Maggot King BOTW');
  });

  /**
   * The case that made this worth building carefully: whoever is on duty must
   * not be sent chasing someone who has left.
   */
  it('says when the winner has left and names the stand-in', () => {
    const message = buildEventDutyMessage({
      ...base,
      picker: {
        winner: {
          playerName: 'The Victory',
          eventName: 'Maggot King BOTW',
          isActiveMember: false,
        },
        standIn: {
          playerName: 'Still Here',
          eventName: 'Vorkath BOTW',
          isActiveMember: true,
        },
      },
    });

    expect(message).toContain('left the clan');
    expect(message).toContain('Still Here');
  });

  it('falls back to staff choice when the winner left and nobody remains', () => {
    const message = buildEventDutyMessage({
      ...base,
      picker: {
        winner: {
          playerName: 'The Victory',
          eventName: 'Maggot King BOTW',
          isActiveMember: false,
        },
        standIn: null,
      },
    });

    expect(message).toContain('left the clan');
    expect(message).toContain('Staff choice');
  });

  it('handles a deadline that has already passed', () => {
    const message = buildEventDutyMessage({
      ...base,
      picker: noPicker,
      now: utc('2026-08-29T14:00:00'),
    });

    expect(message).toContain('it was due already');
  });

  it('counts down in hours when the deadline is close', () => {
    const message = buildEventDutyMessage({
      ...base,
      picker: noPicker,
      now: utc('2026-08-28T06:00:00'),
    });

    expect(message).toContain('8 hours');
  });

  it('says skill rather than boss for a skill week', () => {
    const message = buildEventDutyMessage({
      ...base,
      type: 'sotw',
      picker: noPicker,
    });

    expect(message).toContain('Skill of the Week');
    expect(message).toContain('skill');
  });
});
