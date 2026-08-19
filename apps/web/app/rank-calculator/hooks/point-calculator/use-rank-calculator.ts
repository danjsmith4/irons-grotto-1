import { useWatch } from 'react-hook-form';
import { useCollectionLogAndCluesPointCalculator } from './collection-log-and-clues/use-collection-log-and-clues-point-calculator';
import { useNotableItemsPointCalculator } from './notable-items/use-notable-items-point-calculator';
import { useSkillingPointCalculator } from './skilling/use-skilling-point-calculator';
import { useCombatPointCalculator } from './combat/use-combat-point-calculator';
import { useRank } from '../use-rank';
import { RankCalculatorSchema } from '../../[player]/submit-rank-calculator-validation';
import { calculateTotalPoints } from '../../utils/calculators/calculate-total-points';
import {
  calculateRankProgress,
  RankProgress,
} from '../../utils/calculators/calculate-rank-progress';
import { useCurrentPlayer } from '../../contexts/current-player-context';

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

  const { playerName } = useCurrentPlayer();

  const { pointsAwarded: totalCollectionLogPoints } =
    useCollectionLogAndCluesPointCalculator();

  const { pointsAwarded: totalNotableItemsPoints } =
    useNotableItemsPointCalculator();

  const { pointsAwarded: totalSkillingPoints } = useSkillingPointCalculator();

  const { pointsAwarded: totalCombatPoints } = useCombatPointCalculator();

  const pointsAwarded = calculateTotalPoints(
    totalCollectionLogPoints,
    totalNotableItemsPoints,
    totalSkillingPoints,
    totalCombatPoints,
  );

  const { standardRankData, ...rankData } = useRank(pointsAwarded, playerName);

  return {
    ...calculateRankProgress(pointsAwarded, rankStructure, rankData),
    standardRankProgress: standardRankData
      ? calculateRankProgress(pointsAwarded, 'Standard', standardRankData)
      : null,
  } satisfies RankCalculatorData;
}
