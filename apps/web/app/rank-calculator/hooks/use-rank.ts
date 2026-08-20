import { useWatch } from 'react-hook-form';
import { RankCalculatorSchema } from '../[player]/submit-rank-calculator-validation';
import { calculateRank } from '../utils/calculators/calculate-rank';

export function useRank(pointsAwarded: number) {
  const rankStructure = useWatch<RankCalculatorSchema, 'rankStructure'>({
    name: 'rankStructure',
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

  const result = calculateRank(
    acquiredItems,
    combatAchievementTier,
    pointsAwarded,
    rankStructure,
  );

  // Staff structures (Admin, Owner, ...) are a single fixed rank, which hides
  // where the player's points actually place them. Resolve the Standard rank
  // alongside it so that stays visible regardless of staff role.
  const standardRankData =
    rankStructure === 'Standard'
      ? null
      : calculateRank(
          acquiredItems,
          combatAchievementTier,
          pointsAwarded,
          'Standard',
        );


  return { ...result, standardRankData };
}
