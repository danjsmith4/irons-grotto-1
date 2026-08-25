'use server';

import { z } from 'zod';
import { authActionClient } from '@/app/safe-action';
import { PlayerName } from '@/app/schemas/player';
import { fetchPlayerDetails } from '@/app/player/data-sources/fetch-player-details/fetch-player-details';
import { calculatePlayerPoints } from '@/app/player/utils/calculate-player-points';
import { calculateRank } from '@/app/player/utils/calculators/calculate-rank';
import { canApplyForRank, rankThresholdsFor } from '@/config/ranks';
import { ActionError } from '@/app/action-error';
import type { Rank } from '@/config/enums';

export interface RankReveal {
  /** The rank these points earn. **Not** granted — see below. */
  rank: Rank;
  nextRank: Rank | null;
  points: number;
  /** Points at which `rank` starts, so the reveal can show the band. */
  rankThreshold: number;
  /** Points needed for `nextRank`, or null at the top of the ladder. */
  nextRankThreshold: number | null;
  /** False for mains, who are not on the ironman ladder. */
  canApply: boolean;
  /** A rank the player is being held off by items or Master CAs. */
  throttleReason: 'items' | 'Master CAs' | null;
}

/**
 * The number behind the reveal at the end of onboarding.
 *
 * ⚠️ **This grants nothing.** The player's stored rank stays `Unranked` and
 * the reveal is explicit that it is a rank to *apply* for. Approving a rank
 * assigns a real in-game clan rank and real Discord roles, which is a
 * moderator's decision made through `approveSubmission` — a signup form must
 * never be able to hand those out, however good the animation is.
 *
 * `fetchPlayerDetails` is what makes the number real: it runs the full source
 * pipeline and, through `processPlayerData`, writes the player's points. So by
 * the time the reveal plays, the leaderboard already agrees with it.
 */
export const revealRankAction = authActionClient
  .metadata({ actionName: 'join-reveal-rank' })
  .schema(z.object({ playerName: PlayerName }))
  .action(
    async ({
      parsedInput: { playerName },
      ctx: { userId },
    }): Promise<RankReveal> => {
      const details = await fetchPlayerDetails(playerName, userId);

      if (!details.success) {
        throw new ActionError('Could not read your stats just now.');
      }

      const { totalPoints } = await calculatePlayerPoints(details.data);
      const { acquiredItems, combatAchievementTier, accountType } =
        details.data;
      const { rank, nextRank, throttleReason } = calculateRank(
        acquiredItems,
        combatAchievementTier,
        totalPoints,
        accountType,
      );

      const thresholds = rankThresholdsFor(accountType);

      return {
        rank,
        nextRank,
        points: totalPoints,
        rankThreshold: thresholds[rank] ?? 0,
        nextRankThreshold: nextRank ? (thresholds[nextRank] ?? null) : null,
        canApply: canApplyForRank(accountType),
        throttleReason,
      };
    },
  );
