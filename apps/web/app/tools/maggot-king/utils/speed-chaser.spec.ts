import {
  flatPaceTicks,
  formatTickDelta,
  formatTicks,
  parseKillTime,
  speedChaserBudgetTicks,
  summariseAttempt,
} from './speed-chaser';

describe('Maggot King Speed Chaser', () => {
  describe('the budget', () => {
    it('is 9 minutes expressed in ticks', () => {
      expect(speedChaserBudgetTicks).toBe((9 * 60) / 0.6);
      expect(formatTicks(speedChaserBudgetTicks)).toBe('09:00.0');
    });

    it('splits into a flat pace of 1:48.0 per kill', () => {
      expect(formatTicks(flatPaceTicks)).toBe('01:48.0');
    });
  });

  describe('formatTicks', () => {
    it.each([
      [0, '00:00.0'],
      [1, '00:00.6'],
      [2, '00:01.2'],
      [5, '00:03.0'],
      [100, '01:00.0'],
      [171, '01:42.6'],
      [180, '01:48.0'],
      [900, '09:00.0'],
    ])('formats %i ticks as %s', (ticks, expected) => {
      expect(formatTicks(ticks)).toBe(expected);
    });

    it('signs negative durations', () => {
      expect(formatTicks(-21)).toBe('-00:12.6');
    });

    it('always signs a delta, so banked and owed time are told apart', () => {
      expect(formatTickDelta(21)).toBe('+00:12.6');
      expect(formatTickDelta(-21)).toBe('-00:12.6');
      expect(formatTickDelta(0)).toBe('+00:00.0');
    });
  });

  describe('parseKillTime', () => {
    it.each([
      ['1:42.6', 171],
      ['1:42.60', 171],
      ['1:42:6', 171],
      ['01:42.6', 171],
      ['102.6', 171],
      ['1:42', 170],
      ['102', 170],
      ['102,6', 171],
      ['  1:48.0  ', 180],
    ])('reads %s as %i ticks', (input, expected) => {
      expect(parseKillTime(input)).toEqual({ ticks: expected, error: null });
    });

    it('snaps a time the game could not have produced to the nearest tick', () => {
      // 1:42.5 is not tick-aligned; 171 ticks (1:42.6) is the nearest that is.
      expect(parseKillTime('1:42.5').ticks).toBe(171);
      expect(parseKillTime('1:42.2').ticks).toBe(170);
    });

    it('treats a blank field as a kill that has not happened, not an error', () => {
      expect(parseKillTime('')).toEqual({ ticks: null, error: null });
      expect(parseKillTime('   ')).toEqual({ ticks: null, error: null });
    });

    it.each(['abc', '1:2:3:4', '1:75.0', '0', '0:00.0', '1-42'])(
      'rejects %s',
      (input) => {
        const { ticks, error } = parseKillTime(input);

        expect(ticks).toBeNull();
        expect(error).toEqual(expect.any(String));
      },
    );
  });

  describe('summariseAttempt', () => {
    const blank = [null, null, null, null, null];

    it('starts with the whole budget and the flat pace on offer', () => {
      const summary = summariseAttempt(blank);

      expect(summary).toMatchObject({
        killsLogged: 0,
        killsRemaining: 5,
        elapsedTicks: 0,
        remainingTicks: 900,
        requiredAverageTicks: 180,
        averageKillTicks: null,
        projectedTicks: null,
        status: 'not-started',
      });
    });

    it('spends the budget and re-averages what is left over the remaining kills', () => {
      // Two kills at 1:30.0 (150 ticks) leaves 600 ticks over three kills.
      const summary = summariseAttempt([150, 150, null, null, null]);

      expect(summary.elapsedTicks).toBe(300);
      expect(summary.remainingTicks).toBe(600);
      expect(summary.killsRemaining).toBe(3);
      expect(summary.requiredAverageTicks).toBe(200);
      expect(formatTicks(summary.requiredAverageTicks!)).toBe('02:00.0');
    });

    it('floors the required average — a fractional tick is not achievable', () => {
      // 599 ticks left over three kills is 199.67 each; 199 is the real ceiling.
      const summary = summariseAttempt([151, 150, null, null, null]);

      expect(summary.remainingTicks).toBe(599);
      expect(summary.requiredAverageTicks).toBe(199);
      expect(summary.requiredAverageTicks! * summary.killsRemaining).toBeLessThanOrEqual(
        summary.remainingTicks,
      );
    });

    it('banks time under the flat pace and owes it over', () => {
      expect(summariseAttempt([150, null, null, null, null]).bankedTicks).toBe(30);
      expect(summariseAttempt([200, null, null, null, null]).bankedTicks).toBe(-20);
      expect(summariseAttempt([180, null, null, null, null]).bankedTicks).toBe(0);
    });

    it('is at risk once the flat pace has been lost, not only once time runs out', () => {
      expect(summariseAttempt([150, null, null, null, null]).status).toBe(
        'on-track',
      );
      expect(summariseAttempt([200, null, null, null, null]).status).toBe(
        'at-risk',
      );
    });

    it('projects the finish from the pace so far', () => {
      // Three kills averaging 160 ticks projects 800 for five.
      expect(summariseAttempt([160, 160, 160, null, null]).projectedTicks).toBe(
        800,
      );
    });

    it('passes a dead-on 09:00.0 — the budget is inclusive', () => {
      const summary = summariseAttempt([180, 180, 180, 180, 180]);

      expect(summary.elapsedTicks).toBe(900);
      expect(summary.remainingTicks).toBe(0);
      expect(summary.status).toBe('complete');
    });

    it('fails a single tick over', () => {
      expect(summariseAttempt([180, 180, 180, 180, 181]).status).toBe('failed');
    });

    it('fails as soon as there is no time left for the kills still to come', () => {
      // Four kills have consumed the lot; the fifth cannot happen in zero ticks.
      expect(summariseAttempt([225, 225, 225, 225, null]).status).toBe('failed');
    });

    it('counts only the kills that were entered, whatever order they arrived in', () => {
      const summary = summariseAttempt([150, null, 150, null, null]);

      expect(summary.killsLogged).toBe(2);
      expect(summary.killsRemaining).toBe(3);
      expect(summary.elapsedTicks).toBe(300);
    });
  });
});
