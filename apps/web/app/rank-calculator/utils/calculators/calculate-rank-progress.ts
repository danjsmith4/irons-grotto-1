import { CommonPointCalculatorData } from '@/app/schemas/rank-calculator';
import { AccountType } from '@/app/schemas/staff';
import { rankThresholdsFor } from '@/config/ranks';
import { RankData } from './calculate-rank';

export type RankProgress = CommonPointCalculatorData & RankData;

/**
 * Turns a resolved rank into progress towards the next one. Split out from the
 * calculator hook so the same maths can be reused wherever a rank needs to be
 * shown with its progress.
 */
export function calculateRankProgress(
  pointsAwarded: number,
  accountType: AccountType | null,
  { rank, nextRank, throttleReason }: RankData,
): RankProgress {
  const thresholds = rankThresholdsFor(accountType);
  const currentRankThreshold = thresholds[rank]!;

  const nextRankThreshold = !nextRank ? pointsAwarded : thresholds[nextRank]!;

  const pointsRemaining = nextRankThreshold
    ? nextRankThreshold - pointsAwarded
    : pointsAwarded;

  const pointsAwardedPercentage = nextRankThreshold
    ? (pointsAwarded - currentRankThreshold) /
      (nextRankThreshold - currentRankThreshold)
    : pointsAwarded / nextRankThreshold;

  return {
    pointsAwarded,
    pointsAwardedPercentage,
    pointsRemaining,
    rank,
    nextRank,
    throttleReason,
  };
}
