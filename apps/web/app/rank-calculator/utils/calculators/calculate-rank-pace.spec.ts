import {
  calculateRankPace,
  minimumPaceSampleSize,
} from './calculate-rank-pace';

const now = new Date('2026-08-20T00:00:00.000Z');
const medians = {
  Captain: { medianDays: 30, sampleSize: minimumPaceSampleSize },
  Corporal: { medianDays: 60, sampleSize: minimumPaceSampleSize },
};

describe('calculateRankPace', () => {
  it('dates the stint from the most recent promotion to that rank', () => {
    const result = calculateRankPace(
      [
        {
          oldRank: null,
          newRank: 'Captain',
          createdAt: '2026-01-01T00:00:00Z',
        },
        {
          oldRank: 'Captain',
          newRank: 'Corporal',
          createdAt: '2026-06-01T00:00:00Z',
        },
        {
          oldRank: 'Corporal',
          newRank: 'Captain',
          createdAt: '2026-08-10T00:00:00Z',
        },
      ],
      '2022-01-27',
      medians,
      'Captain',
      now,
    );

    expect(result?.daysAtRank).toBeCloseTo(10);
    expect(result?.isFromRankUp).toBe(true);
  });

  it('falls back to the join date when the rank was never awarded', () => {
    const result = calculateRankPace([], '2026-07-21', medians, 'Captain', now);

    expect(result?.daysAtRank).toBeCloseTo(30);
    expect(result?.isFromRankUp).toBe(false);
  });

  it('returns null for an unparseable date', () => {
    expect(
      calculateRankPace([], 'not-a-date', medians, 'Captain', now),
    ).toBeNull();
  });

  // The clan median is computed but not rendered — see `clan-median-pace.tsx`.
  // These guard the maths so it can be switched back on unchanged.
  describe('clan median (parked)', () => {
    it('flags a player who has held the rank longer than the clan median', () => {
      const result = calculateRankPace(
        [],
        '2026-01-01',
        medians,
        'Captain',
        now,
      );

      expect(result?.isBehindPace).toBe(true);
    });

    it('flags a player moving faster than the clan median', () => {
      const result = calculateRankPace(
        [],
        '2026-08-15',
        medians,
        'Captain',
        now,
      );

      expect(result?.isBehindPace).toBe(false);
    });

    it('has no verdict for a rank nobody has left yet', () => {
      const result = calculateRankPace([], '2026-01-01', medians, 'Owner', now);

      expect(result?.clanMedianDays).toBeNull();
      expect(result?.isBehindPace).toBeNull();
      expect(result?.clanSampleSize).toBe(0);
    });

    it('withholds a median drawn from too few promotions', () => {
      // One member who happened to be a drop away from the next rank shouldn't
      // make it look like the clan clears it in a day.
      const thin = {
        Captain: { medianDays: 1, sampleSize: minimumPaceSampleSize - 1 },
      };
      const result = calculateRankPace([], '2026-01-01', thin, 'Captain', now);

      expect(result?.clanMedianDays).toBeNull();
      expect(result?.isBehindPace).toBeNull();
      // The count is still reported so the UI can explain itself.
      expect(result?.clanSampleSize).toBe(minimumPaceSampleSize - 1);
    });

    it('shows a median once enough promotions back it', () => {
      const result = calculateRankPace(
        [],
        '2026-01-01',
        { Captain: { medianDays: 30, sampleSize: minimumPaceSampleSize } },
        'Captain',
        now,
      );

      expect(result?.clanMedianDays).toBe(30);
    });
  });
});
