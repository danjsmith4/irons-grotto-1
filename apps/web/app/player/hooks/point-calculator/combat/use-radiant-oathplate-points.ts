import { useWatch } from 'react-hook-form';
import { RankCalculatorSchema } from '@/app/player/[player]/submit-rank-calculator-validation';
import { useCalculatorScaling } from '../use-calculator-scaling';
import { calculateRadiantOathplatePoints } from '@/app/player/utils/calculators/calculate-radiant-oathplate-points';

export function useRadiantOathplatePoints() {
  const hasRadiantOathplate = useWatch<
    RankCalculatorSchema,
    'hasRadiantOathplate'
  >({
    name: 'hasRadiantOathplate',
  });
  const scaling = useCalculatorScaling();

  return calculateRadiantOathplatePoints(hasRadiantOathplate, scaling);
}
