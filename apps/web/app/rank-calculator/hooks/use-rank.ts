import { useWatch } from 'react-hook-form';
import { RankCalculatorSchema } from '../[player]/submit-rank-calculator-validation';
import { calculateRank } from '../utils/calculators/calculate-rank';
import { updatePlayerPointsAction } from '../actions/update-player-points-action';
import { useEffect } from 'react';

export function useRank(pointsAwarded: number, playerName: string) {
  const rankStructure = useWatch<RankCalculatorSchema, 'rankStructure'>({
    name: 'rankStructure',
  });
  const acquiredItems = useWatch<RankCalculatorSchema, 'acquiredItems'>({
    name: 'acquiredItems',
  });
  const combatAchievementTier = useWatch<
    RankCalculatorSchema,
    'combatAchievementTier'
  >({
    name: 'combatAchievementTier',
  });

  const result = calculateRank(
    acquiredItems,
    combatAchievementTier,
    pointsAwarded,
    rankStructure,
  );

  // Update player points when points change
  useEffect(() => {
    if (pointsAwarded > 0) {
      updatePlayerPointsAction(playerName, pointsAwarded).catch((error) => {
        console.error(
          `Failed to update points for player ${playerName}:`,
          error,
        );
      });
    }
  }, [playerName, pointsAwarded]);

  return result;
}
