import { calculateClanStanding } from './calculate-clan-standing';

describe('calculateClanStanding', () => {
  const others = [500, 400, 300, 200];

  it('places a top scorer first', () => {
    expect(calculateClanStanding(others, 5, 600)).toEqual({
      position: 1,
      memberCount: 5,
      topPercent: 1 / 5,
    });
  });

  it('places a bottom scorer last', () => {
    expect(calculateClanStanding(others, 5, 100)?.position).toBe(5);
  });

  it('places a mid scorer between the members it beats', () => {
    expect(calculateClanStanding(others, 5, 350)?.position).toBe(3);
  });

  it('counts a tie as the better position', () => {
    // Only strictly-greater totals push you down, so matching 4th place ties
    // for 4th rather than dropping to 5th.
    expect(calculateClanStanding(others, 5, 200)?.position).toBe(4);
  });

  it('reports the top percentile, not the inverse', () => {
    // Guards the direction: first of a hundred is the top 1%, not the top 99%.
    const hundred = Array.from({ length: 99 }, (_, i) => i);

    expect(calculateClanStanding(hundred, 100, 1000)?.topPercent).toBeCloseTo(
      0.01,
    );
  });

  it('returns null when there are no members', () => {
    expect(calculateClanStanding([], 0, 100)).toBeNull();
  });
});
