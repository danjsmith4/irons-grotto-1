import { Rank } from '@/config/enums';
import { RankStructure } from '@/app/schemas/rank-calculator';
import {
  rankRequiredCombatAchievements,
  rankRequiredItems,
  rankThresholds,
} from '@/config/ranks';
import type { RankCalculatorSchema } from '../../[player]/submit-rank-calculator-validation';
import { CombatAchievementTier } from '@/app/schemas/osrs';

export interface RankData {
  rank: Rank;
  nextRank: Rank | null;
  throttleReason: 'items' | 'Master CAs' | null;
}

export function calculateRank(
  acquiredItems: RankCalculatorSchema['acquiredItems'],
  combatAchievementTier: CombatAchievementTier,
  pointsAwarded: number,
  rankStructure: RankStructure,
): RankData {
  const rankData = Object.entries(rankThresholds[rankStructure]) as [
    Rank,
    number,
  ][];
  const combatAchievementTiers = CombatAchievementTier.options;
  const achievedCombatAchievementTierIndex = combatAchievementTiers.indexOf(
    combatAchievementTier,
  );

  const [[initialRank]] = rankData;

  return rankData.reduce<RankData>(
    (acc, [rank, threshold], i) => {
      if (!acc.throttleReason && pointsAwarded >= threshold) {
        const hasRequiredItems =
          rankRequiredItems[rank]?.some((itemRequirements) =>
            itemRequirements.every((item) => acquiredItems[item]),
          ) ?? true;

        const hasRequiredCombatAchievements =
          (rankRequiredCombatAchievements[rank] &&
            combatAchievementTiers.indexOf(
              rankRequiredCombatAchievements[rank],
            ) <= achievedCombatAchievementTierIndex) ??
          true;

        if (!hasRequiredItems) {
          return {
            ...acc,
            throttleReason: 'items',
          };
        }

        if (!hasRequiredCombatAchievements) {
          return {
            ...acc,
            throttleReason: 'Master CAs',
          };
        }

        const [nextRank = null] = rankData[i + 1] ?? [];

        return { rank, nextRank, throttleReason: null };
      }

      return acc;
    },
    { rank: initialRank, nextRank: null, throttleReason: null },
  );
}
