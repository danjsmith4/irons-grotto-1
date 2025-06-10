import { Rank } from '@/config/enums';
import { RankStructure } from '@/app/schemas/rank-calculator';
import { rankThresholds } from '@/config/ranks';

export interface RankData {
  rank: Rank;
  nextRank: Rank | null;
}

export function calculateRank(
  pointsAwarded: number,
  rankStructure: RankStructure,
): RankData {
  const rankData = Object.entries(rankThresholds[rankStructure]) as [
    Rank,
    number,
  ][];

  const [[initialRank]] = rankData;

  return rankData.reduceRight<RankData>(
    (acc, [rank, threshold], i) => {
      if (acc.rank === initialRank && pointsAwarded >= threshold) {
        const [nextRank] = rankData[i + 1] ?? [];

        return { rank, nextRank: nextRank ?? null };
      }

      return acc;
    },
    { rank: initialRank, nextRank: null },
  );
}
