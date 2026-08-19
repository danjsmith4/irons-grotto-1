import { calculateRank } from './calculate-rank';
import { calculateRankProgress } from './calculate-rank-progress';
import { Rank } from '@/config/enums';
import { rankThresholds } from '@/config/ranks';

const maxedItems = {
  'Deadeye prayer scroll': true,
  'Mystic vigour prayer scroll': true,
  'Dragon warhammer': true,
} as const;

it('reports progress between the current and next Standard rank thresholds', () => {
  const pointsAwarded = 5750; // Sergeant is 4500, Cadet is 7000
  const rankData = calculateRank(
    maxedItems,
    'Grandmaster',
    pointsAwarded,
    'Standard',
  );

  const progress = calculateRankProgress(
    pointsAwarded,
    'Standard',
    rankData,
  );

  expect(progress.rank).toEqual<Rank>('Sergeant');
  expect(progress.nextRank).toEqual<Rank>('Cadet');
  expect(progress.pointsRemaining).toBe(
    rankThresholds.Standard.Cadet! - pointsAwarded,
  );
  expect(progress.pointsAwardedPercentage).toBeCloseTo(0.5);
});

it('reports a staff structure as a single completed rank', () => {
  const pointsAwarded = 5750;
  const rankData = calculateRank(
    maxedItems,
    'Grandmaster',
    pointsAwarded,
    'Admin',
  );

  const progress = calculateRankProgress(pointsAwarded, 'Admin', rankData);

  expect(progress.rank).toEqual<Rank>('Administrator');
  expect(progress.nextRank).toBeNull();
});

it('resolves the same Standard rank for a staff player as for a regular one', () => {
  const pointsAwarded = 5750;

  const staffStandardProgress = calculateRankProgress(
    pointsAwarded,
    'Standard',
    calculateRank(maxedItems, 'Grandmaster', pointsAwarded, 'Standard'),
  );

  expect(staffStandardProgress.rank).toEqual<Rank>('Sergeant');
  expect(staffStandardProgress.nextRank).toEqual<Rank>('Cadet');
});

it('carries a throttled rank through to the progress label data', () => {
  const pointsAwarded = 5750; // enough for Sergeant, but no defence-reducing weapon

  const progress = calculateRankProgress(
    pointsAwarded,
    'Standard',
    calculateRank(
      { 'Deadeye prayer scroll': true, 'Mystic vigour prayer scroll': true },
      'Grandmaster',
      pointsAwarded,
      'Standard',
    ),
  );

  expect(progress.throttleReason).toBe('items');
});
