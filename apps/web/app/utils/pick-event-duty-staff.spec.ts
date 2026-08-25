import {
  pickEventDutyStaff,
  type EventDutyCandidate,
} from './pick-event-duty-staff';

const staff: EventDutyCandidate[] = [
  { playerName: 'Alice', discordUserId: '1' },
  { playerName: 'Bob', discordUserId: '2' },
  { playerName: 'Carol', discordUserId: '3' },
];

describe('pickEventDutyStaff', () => {
  it('picks from the pool using the injected roll', () => {
    expect(pickEventDutyStaff(staff, null, () => 0)?.playerName).toBe('Alice');
    expect(pickEventDutyStaff(staff, null, () => 0.5)?.playerName).toBe('Bob');
    expect(pickEventDutyStaff(staff, null, () => 0.99)?.playerName).toBe(
      'Carol',
    );
  });

  /**
   * The reason the exclusion exists: with three staff, a plain random pick
   * lands on the person already holding duty often enough that the button
   * looks broken.
   */
  it('never re-rolls the same person when there is anyone else', () => {
    const rolls = [0, 0.25, 0.5, 0.75, 0.99];

    rolls.forEach((roll) => {
      expect(
        pickEventDutyStaff(staff, 'Alice', () => roll)?.playerName,
      ).not.toBe('Alice');
    });
  });

  it('can still reach everyone who is not on duty', () => {
    const reachable = new Set(
      [0, 0.6].map(
        (roll) => pickEventDutyStaff(staff, 'Alice', () => roll)?.playerName,
      ),
    );

    expect(reachable).toEqual(new Set(['Bob', 'Carol']));
  });

  /** Excluding the last person from a pool of one would return nobody. */
  it('keeps the only candidate even when they are already on duty', () => {
    const solo = [staff[0]];

    expect(pickEventDutyStaff(solo, 'Alice', () => 0)?.playerName).toBe(
      'Alice',
    );
  });

  it('returns null when there is no staff at all', () => {
    expect(pickEventDutyStaff([], null, () => 0)).toBeNull();
  });

  /** `Math.random()` can return values arbitrarily close to 1. */
  it('never indexes past the end of the pool', () => {
    expect(pickEventDutyStaff(staff, null, () => 0.999999)).toBeTruthy();
  });
});
