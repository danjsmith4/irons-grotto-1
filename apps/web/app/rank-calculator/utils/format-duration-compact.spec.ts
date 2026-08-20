import { formatDurationCompact } from './format-duration-compact';

describe('formatDurationCompact', () => {
  it.each([
    [0, 'today'],
    [0.4, 'today'],
    [1, '1d'],
    [18, '18d'],
    [59, '59d'],
    [60, '2mo'],
    [180, '6mo'],
    [330, '11mo'],
    // Rounds to 12 months, which reads better as a year.
    [364, '1y'],
    [366, '1y'],
    [800, '2y 2mo'],
  ])('formats %p days as %p', (days, expected) => {
    expect(formatDurationCompact(days)).toBe(expected);
  });

  it('does not blow up on nonsense input', () => {
    expect(formatDurationCompact(Number.NaN)).toBe('today');
    expect(formatDurationCompact(-5)).toBe('today');
  });
});
