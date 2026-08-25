import { useWatch } from 'react-hook-form';
import { RankCalculatorSchema } from '@/app/player/[player]/submit-rank-calculator-validation';
import { calculateCombatAchievementPoints } from '@/app/player/utils/calculators/calculate-combat-achievement-points';
import { useCalculatorScaling } from '../use-calculator-scaling';

export function useCombatAchievementTierPoints() {
  const scaling = useCalculatorScaling();
  const combatAchievementTier = useWatch<
    RankCalculatorSchema,
    'combatAchievementTier'
  >({
    name: 'combatAchievementTier',
  });

  return calculateCombatAchievementPoints(combatAchievementTier, scaling);
}
