import { useWatch } from 'react-hook-form';
import { useRank } from '../use-rank';
import { useTotalPoints } from './use-total-points';
import { RankCalculatorSchema } from '../../[player]/submit-rank-calculator-validation';
import {
  calculateRankProgress,
  RankProgress,
} from '../../utils/calculators/calculate-rank-progress';

export type RankCalculatorData = RankProgress;

export function useRankCalculator() {
  const accountType = useWatch<RankCalculatorSchema, 'accountType'>({
    name: 'accountType',
  });

  const pointsAwarded = useTotalPoints();

  const rankData = useRank(pointsAwarded);

  return calculateRankProgress(
    pointsAwarded,
    accountType,
    rankData,
  ) satisfies RankCalculatorData;
}
