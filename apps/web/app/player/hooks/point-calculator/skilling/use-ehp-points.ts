import { useWatch } from 'react-hook-form';
import { RankCalculatorSchema } from '@/app/player/[player]/submit-rank-calculator-validation';
import { calculateEhpPoints } from '@/app/player/utils/calculators/calculate-ehp-points';
import { useCalculatorScaling } from '../use-calculator-scaling';

export function useEhpPoints() {
  const ehp = useWatch<RankCalculatorSchema, 'ehp'>({ name: 'ehp' });
  const scaling = useCalculatorScaling();

  return calculateEhpPoints(ehp, scaling);
}
