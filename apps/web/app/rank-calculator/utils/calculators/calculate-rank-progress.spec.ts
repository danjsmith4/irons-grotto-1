import { calculateRank } from './calculate-rank';
import { calculateRankProgress } from './calculate-rank-progress';
import { Rank } from '@/config/enums';
import { rankThresholds } from '@/config/ranks';

const maxedItems = {
  'Deadeye prayer scroll': true,
  'Mystic vigour prayer scroll': true,
  'Dragon warhammer': true,
} as const;

it('reports progress between the current and next rank thresholds', () => {
  const pointsAwarded = 5750; // Sergeant is 4500, Cadet is 7000
  const rankData = calculateRank(
    maxedItems,
    'Grandmaster',
    pointsAwarded,
    'ironman',
  );

  const progress = calculateRankProgress(pointsAwarded, 'ironman', rankData);

  expect(progress.rank).toEqual<Rank>('Sergeant');
  expect(progress.nextRank).toEqual<Rank>('Cadet');
  expect(progress.pointsRemaining).toBe(rankThresholds.Cadet! - pointsAwarded);
  expect(progress.pointsAwardedPercentage).toBeCloseTo(0.5);
});

it('sorts a main onto the single main-account rank, whatever their points', () => {
  const pointsAwarded = 5750;
  const rankData = calculateRank(
    maxedItems,
    'Grandmaster',
    pointsAwarded,
    'main',
  );

  const progress = calculateRankProgress(pointsAwarded, 'main', rankData);

  expect(progress.rank).toEqual<Rank>('Looter');
  expect(progress.nextRank).toBeNull();
});

it.each(['group_ironman', 'unranked_group_ironman', null] as const)(
  'ranks %s on the ironman ladder, the same as any other ironman',
  (accountType) => {
    const pointsAwarded = 5750;
    const rankData = calculateRank(
      maxedItems,
      'Grandmaster',
      pointsAwarded,
      accountType,
    );

    const progress = calculateRankProgress(
      pointsAwarded,
      accountType,
      rankData,
    );

    expect(progress.rank).toEqual<Rank>('Sergeant');
    expect(progress.nextRank).toEqual<Rank>('Cadet');
  },
);
