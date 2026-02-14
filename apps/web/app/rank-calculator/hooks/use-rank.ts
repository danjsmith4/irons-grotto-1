import { useWatch } from 'react-hook-form';
import { RankCalculatorSchema } from '../[player]/submit-rank-calculator-validation';
import { calculateRank } from '../utils/calculators/calculate-rank';
import { updatePlayerPoints } from '@/lib/db/player-operations';
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
      updatePlayerPoints(playerName, pointsAwarded).catch((error) => {
        console.error(`Failed to update points for player ${playerName}:`, error);
      });
    }
  }, [playerName, pointsAwarded]);

  return result;
}
