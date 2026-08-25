import { useWatch } from 'react-hook-form';
import { RankCalculatorSchema } from '@/app/player/[player]/submit-rank-calculator-validation';
import { calculateBloodTorvaPoints } from '@/app/player/utils/calculators/calculate-blood-torva-points';
import { useCalculatorScaling } from '../use-calculator-scaling';

export function useBloodTorvaPoints() {
  const hasBloodTorva = useWatch<RankCalculatorSchema, 'hasBloodTorva'>({
    name: 'hasBloodTorva',
  });
  const scaling = useCalculatorScaling();

  return calculateBloodTorvaPoints(hasBloodTorva, scaling);
}
