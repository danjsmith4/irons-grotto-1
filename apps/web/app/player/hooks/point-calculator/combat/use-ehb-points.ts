import { useWatch } from 'react-hook-form';
import { RankCalculatorSchema } from '@/app/player/[player]/submit-rank-calculator-validation';
import { calculateEhbPoints } from '@/app/player/utils/calculators/calculate-ehb-points';

export function useEhbPoints() {
  const ehb = useWatch<RankCalculatorSchema, 'ehb'>({ name: 'ehb' });

  return calculateEhbPoints(ehb);
}
