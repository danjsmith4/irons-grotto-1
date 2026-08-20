import { useWatch } from 'react-hook-form';
import { useRank } from '../use-rank';
import { useTotalPoints } from './use-total-points';
import { RankCalculatorSchema } from '../../[player]/submit-rank-calculator-validation';
import {
  calculateRankProgress,
  RankProgress,
} from '../../utils/calculators/calculate-rank-progress';

export type RankCalculatorData = RankProgress & {
  /**
   * Progress through the Standard rank structure, for players on a staff
   * structure. Null when Standard is already the selected structure.
   */
  standardRankProgress: RankProgress | null;
};

export function useRankCalculator() {
  const rankStructure = useWatch<RankCalculatorSchema, 'rankStructure'>({
    name: 'rankStructure',
  });

  const pointsAwarded = useTotalPoints();

  const { standardRankData, ...rankData } = useRank(pointsAwarded);

  return {
    ...calculateRankProgress(pointsAwarded, rankStructure, rankData),
    standardRankProgress: standardRankData
      ? calculateRankProgress(pointsAwarded, 'Standard', standardRankData)
      : null,
  } satisfies RankCalculatorData;
}
