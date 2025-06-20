import {
  BonusPointCalculatorData,
  CommonPointCalculatorData,
} from '@/app/schemas/rank-calculator';
import { calculateCombatPoints } from '@/app/rank-calculator/utils/calculators/calculate-combat-points';
import { useWatch } from 'react-hook-form';
import { RankCalculatorSchema } from '@/app/rank-calculator/[player]/submit-rank-calculator-validation';
import { useEhbPoints } from './use-ehb-points';
import { useCombatAchievementTierPoints } from './use-combat-achievement-points';
import { useCalculatorScaling } from '../use-calculator-scaling';
import { useTzhaarCapePoints } from './use-tzhaar-cape-points';
import { useBloodTorvaPoints } from './use-blood-torva-points';
import { useDizanasQuiverPoints } from './use-dizanas-quiver-points';

export interface CombatPointCalculatorData
  extends CommonPointCalculatorData,
    BonusPointCalculatorData {
  combatAchievementTierPoints: number;
  ehbPoints: number;
  tzhaarCapePoints: number;
  bloodTorvaPoints: number;
  dizanasQuiverPoints: number;
}

export function useCombatPointCalculator() {
  const bonusPointsAwarded = useWatch<
    RankCalculatorSchema,
    'combatBonusPoints'
  >({
    name: 'combatBonusPoints',
  });

  const scaling = useCalculatorScaling();
  const ehbPoints = useEhbPoints();
  const combatAchievementTierPoints = useCombatAchievementTierPoints();
  const tzhaarCapePoints = useTzhaarCapePoints();
  const bloodTorvaPoints = useBloodTorvaPoints();
  const dizanasQuiverPoints = useDizanasQuiverPoints();

  const { pointsAwarded, pointsAwardedPercentage, pointsRemaining } =
    calculateCombatPoints(
      ehbPoints,
      combatAchievementTierPoints,
      tzhaarCapePoints,
      bloodTorvaPoints,
      dizanasQuiverPoints,
      bonusPointsAwarded,
      scaling,
    );

  return {
    pointsAwarded,
    pointsAwardedPercentage,
    pointsRemaining,
    combatAchievementTierPoints,
    ehbPoints,
    tzhaarCapePoints,
    bloodTorvaPoints,
    dizanasQuiverPoints,
    bonusPointsAwarded,
  } satisfies CombatPointCalculatorData;
}
