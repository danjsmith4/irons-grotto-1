import {
  CommonPointCalculatorData,
  RankStructure,
} from '@/app/schemas/rank-calculator';
import { rankThresholds } from '@/config/ranks';
import { RankData } from './calculate-rank';

export type RankProgress = CommonPointCalculatorData & RankData;

/**
 * Turns a resolved rank into progress towards the next one, within a given
 * rank structure. Split out from the calculator hook so the same maths can be
 * run twice: once for the player's selected structure, and once against
 * Standard to show staff where their points would place them.
 */
export function calculateRankProgress(
  pointsAwarded: number,
  rankStructure: RankStructure,
  { rank, nextRank, throttleReason }: RankData,
): RankProgress {
  const currentRankThreshold = rankThresholds[rankStructure][rank]!;

  const nextRankThreshold = !nextRank
    ? pointsAwarded
    : rankThresholds[rankStructure][nextRank]!;

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
