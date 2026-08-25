import { JoinDate } from './player';

describe('JoinDate', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it('accepts a date in the past', () => {
    expect(JoinDate.safeParse(new Date('2024-01-01')).success).toBe(true);
  });

  it('accepts right now', () => {
    expect(JoinDate.safeParse(new Date()).success).toBe(true);
  });

  it('rejects a date in the future', () => {
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);

    expect(JoinDate.safeParse(tomorrow).success).toBe(false);
  });

  /**
   * The regression this schema exists for.
   *
   * `z.date().max(new Date())` freezes its ceiling at module-import time, so a
   * server that has been running for an hour rejects anything from the last
   * hour — including "now", which is what onboarding sends for a member the
   * clan list has never seen. Advancing the clock after the module is loaded is
   * exactly that situation.
   */
  it('still accepts "now" long after the module was first loaded', () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-08-25T21:04:14.449Z'));

    expect(JoinDate.safeParse(new Date()).success).toBe(true);

    jest.setSystemTime(new Date('2027-03-01T09:00:00.000Z'));

    expect(JoinDate.safeParse(new Date()).success).toBe(true);
  });

  it('explains itself in language a player can act on', () => {
    const result = JoinDate.safeParse(new Date(Date.now() + 60_000));

    expect(result.success).toBe(false);

    if (!result.success) {
      // Never a raw timestamp — the old message quoted the server's boot time,
      // which meant nothing to anyone reading it.
      expect(result.error.issues[0].message).toBe(
        'Your join date cannot be in the future.',
      );
    }
  });
});
