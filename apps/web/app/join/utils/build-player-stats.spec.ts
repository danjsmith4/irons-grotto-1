import { buildPlayerStats } from './build-player-stats';

const temple = {
  totalLevel: 2131,
  ehb: 249.952,
  ehp: 969.1635,
};

const collectionLog = { ehc: 525.3192 };

describe('buildPlayerStats', () => {
  it('shows all four figures in a fixed order', () => {
    expect(buildPlayerStats(temple, collectionLog)).toEqual([
      { label: 'Total', value: '2,131' },
      { label: 'EHB', value: '250' },
      { label: 'EHP', value: '969' },
      { label: 'EHC', value: '525' },
    ]);
  });

  it('rounds the efficiency hours', () => {
    // Temple returns four decimal places. Nobody reads them, and they would not
    // fit beside the name.
    const [, ehb] = buildPlayerStats(temple, collectionLog);

    expect(ehb.value).toBe('250');
  });

  it('keeps the total level exact', () => {
    const [total] = buildPlayerStats(temple, collectionLog);

    expect(total.value).toBe('2,131');
  });

  describe('when a source has not answered', () => {
    it('omits EHC rather than showing zero when the log is missing', () => {
      const stats = buildPlayerStats(temple, null);

      expect(stats.map(({ label }) => label)).toEqual([
        'Total',
        'EHB',
        'EHP',
      ]);
    });

    it('omits everything Temple settles when Temple is silent', () => {
      const stats = buildPlayerStats(null, collectionLog);

      expect(stats).toEqual([{ label: 'EHC', value: '525' }]);
    });

    it('is empty before anything has resolved', () => {
      expect(buildPlayerStats(null, null)).toEqual([]);
    });

    it('omits an individual figure the source did not carry', () => {
      const stats = buildPlayerStats(
        { totalLevel: 2131, ehb: null, ehp: 969.1635 },
        collectionLog,
      );

      expect(stats.map(({ label }) => label)).toEqual([
        'Total',
        'EHP',
        'EHC',
      ]);
    });
  });

  it('shows a genuine zero, which is a real answer', () => {
    // A fresh account with no boss kills has 0 EHB, and that is a fact about
    // them — quite different from a source that never replied. Only `null` is
    // absence.
    const stats = buildPlayerStats(
      { totalLevel: 32, ehb: 0, ehp: 0 },
      { ehc: 0 },
    );

    expect(stats).toEqual([
      { label: 'Total', value: '32' },
      { label: 'EHB', value: '0' },
      { label: 'EHP', value: '0' },
      { label: 'EHC', value: '0' },
    ]);
  });
});
