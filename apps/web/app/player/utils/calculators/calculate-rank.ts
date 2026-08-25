import { Rank } from '@/config/enums';
import { AccountType } from '@/app/schemas/staff';
import {
  rankRequiredCombatAchievements,
  rankRequiredItems,
  rankThresholdsFor,
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
  accountType: AccountType | null,
): RankData {
  const rankData = Object.entries(rankThresholdsFor(accountType)) as [
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
