import {
  BonusPointCalculatorData,
  CommonPointCalculatorData,
} from '@/app/schemas/rank-calculator';
import { calculateCollectionLogAndCluesPoints } from '@/app/rank-calculator/utils/calculators/calculate-collection-log-and-clues-points';
import { useWatch } from 'react-hook-form';
import { RankCalculatorSchema } from '@/app/rank-calculator/[player]/submit-rank-calculator-validation';
import { useCollectionLogSlotPoints } from './use-collection-log-slot-points';
import { useCalculatorScaling } from '../use-calculator-scaling';
import { calculateClueScrollPoints } from '@/app/rank-calculator/utils/calculators/calculate-clue-scroll-points';
import { ClueScrollTier } from '@/app/schemas/osrs';

export interface CollectionLogAndCluesPointCalculatorData
  extends CommonPointCalculatorData,
    BonusPointCalculatorData {
  collectionLogSlotPoints: number;
  clueScrollTierPoints: Record<ClueScrollTier, number>;
}

export function useCollectionLogAndCluesPointCalculator() {
  const totalCollectionLogSlots = useWatch<
    RankCalculatorSchema,
    'collectionLogTotal'
  >({
    name: 'collectionLogTotal',
  });
  const clueScrollCounts = useWatch<RankCalculatorSchema, 'clueScrollCounts'>({
    name: 'clueScrollCounts',
  });
  const bonusMultiplier = useWatch<
    RankCalculatorSchema,
    'collectionLogBonusMultiplier'
  >({
    name: 'collectionLogBonusMultiplier',
  });

  const scaling = useCalculatorScaling();
  const collectionLogSlotPoints = useCollectionLogSlotPoints();
  const { tierPoints: clueScrollTierPoints, totalPoints: clueScrollPoints } =
    calculateClueScrollPoints(clueScrollCounts, scaling);
  console.log(clueScrollPoints);
  const {
    pointsAwarded,
    pointsAwardedPercentage,
    pointsRemaining,
    bonusPointsAwarded,
  } = calculateCollectionLogAndCluesPoints(
    collectionLogSlotPoints,
    totalCollectionLogSlots,
    clueScrollPoints,
    bonusMultiplier,
    scaling,
  );

  return {
    pointsAwarded,
    pointsAwardedPercentage,
    pointsRemaining,
    collectionLogSlotPoints,
    bonusMultiplier,
    bonusPointsAwarded,
    clueScrollTierPoints,
  } satisfies CollectionLogAndCluesPointCalculatorData;
}
