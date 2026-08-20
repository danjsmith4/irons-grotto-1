import { useWatch } from 'react-hook-form';
import { RankCalculatorSchema } from '../[player]/submit-rank-calculator-validation';
import { calculateRank } from '../utils/calculators/calculate-rank';

export function useRank(pointsAwarded: number) {
  const accountType = useWatch<RankCalculatorSchema, 'accountType'>({
    name: 'accountType',
  });
  const acquiredItems = useWatch<RankCalculatorSchema, 'acquiredItems'>({
    name: 'acquiredItems',
  });
  const combatAchievementTier = useWatch<
    RankCalculatorSchema,
    'combatAchievementTier'
  >({
    name: 'combatAchievementTier',
  });

  return calculateRank(
    acquiredItems,
    combatAchievementTier,
    pointsAwarded,
    accountType,
  );
}
