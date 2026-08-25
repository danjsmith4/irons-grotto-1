import { useCollectionLogAndCluesPointCalculator } from './collection-log-and-clues/use-collection-log-and-clues-point-calculator';
import { useNotableItemsPointCalculator } from './notable-items/use-notable-items-point-calculator';
import { useSkillingPointCalculator } from './skilling/use-skilling-point-calculator';
import { useCombatPointCalculator } from './combat/use-combat-point-calculator';
import { calculateTotalPoints } from '../../utils/calculators/calculate-total-points';

/**
 * The submission's total points, summed from the four category calculators.
 *
 * Skips the rank resolution `useRankCalculator` does, so use it anywhere that
 * only needs the number.
 */
export function useTotalPoints() {
  const { pointsAwarded: collectionLogPoints } =
    useCollectionLogAndCluesPointCalculator();
  const { pointsAwarded: notableItemsPoints } =
    useNotableItemsPointCalculator();
  const { pointsAwarded: skillingPoints } = useSkillingPointCalculator();
  const { pointsAwarded: combatPoints } = useCombatPointCalculator();

  return calculateTotalPoints(
    collectionLogPoints,
    notableItemsPoints,
    skillingPoints,
    combatPoints,
  );
}
