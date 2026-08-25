import { useWatch } from 'react-hook-form';
import { RankCalculatorSchema } from '@/app/player/[player]/submit-rank-calculator-validation';
import { calculateAchievementDiaryPoints } from '@/app/player/utils/calculators/calculate-achievement-diary-points';
import { useCalculatorScaling } from '../use-calculator-scaling';

export function useAchievementDiaryPoints() {
  const scaling = useCalculatorScaling();
  const achievementDiaries = useWatch<
    RankCalculatorSchema,
    'achievementDiaries'
  >({
    name: 'achievementDiaries',
  });

  return calculateAchievementDiaryPoints(achievementDiaries, scaling);
}
