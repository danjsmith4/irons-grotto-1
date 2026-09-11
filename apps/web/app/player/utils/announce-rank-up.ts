import 'server-only';
import { Rank } from '@/config/enums';
import { clientConstants } from '@/config/constants.client';
import { rankUpMessagesKey } from '@/config/redis';
import { redis } from '@/redis';
import { getPlayerByName } from '@/lib/db/player-operations';
import { scoreStoredPlayer } from '@/app/data-sources/score-players-from-record';
import { rankUpToAnnounce } from './rank-up-to-announce';
import { buildRankUpMessage } from './build-rank-up-message';
import { sendDiscordDirectMessage } from './send-discord-message';

export interface ScoredRank {
  rank: Rank;
  totalPoints: number;
}

export type RankUpAnnouncement =
  | { outcome: 'announced'; rank: Rank }
  | { outcome: 'none' }
  | { outcome: 'failed'; error: string };

/**
 * One entry per account, so a member with two accounts hears about each. The
 * same hash the calculator-era auto-rank nudge used, so the two can never both
 * announce one rank.
 */
function announcedRankField(discordUserId: string, playerName: string) {
  return `${discordUserId}:${playerName.toLowerCase()}`;
}

/**
 * What a player's stored record scores to *before* a refresh overwrites it —
 * the "before" half of the comparison {@link announceRankUpIfEarned} makes.
 *
 * Null when there is nothing honest to compare against: no record yet, or one
 * that cannot be scored (a never-synced stub reads as a near-zero total, so
 * its first real sync would look like a leap up the ladder). A null here means
 * no announcement this run, which is the safe direction.
 */
export async function scoreRankBeforeRefresh(
  playerName: string,
): Promise<ScoredRank | null> {
  const player = await getPlayerByName(playerName);

  if (!player) {
    return null;
  }

  const { rankData, totalPoints, unscorable } = await scoreStoredPlayer(player);

  return unscorable ? null : { rank: rankData.rank, totalPoints };
}

/**
 * DMs a member when the refresh that just ran pushed them over a rank
 * threshold. The decision itself is {@link rankUpToAnnounce}; this loads what
 * it needs, sends the message and remembers that it did.
 *
 * Never throws. A member's stats landing is the point of a refresh, and a
 * closed DM inbox or a Discord outage must not be reported as the refresh
 * failing — so failure comes back as an outcome for the caller to count.
 */
export async function announceRankUpIfEarned(
  playerName: string,
  before: ScoredRank,
): Promise<RankUpAnnouncement> {
  try {
    const player = await getPlayerByName(playerName);

    // Departed members keep their record but are no longer in the clan to
    // apply for anything.
    if (!player?.discordUserId || !player.isActive) {
      return { outcome: 'none' };
    }

    const { rankData, totalPoints, unscorable } =
      await scoreStoredPlayer(player);

    if (unscorable) {
      return { outcome: 'none' };
    }

    const field = announcedRankField(player.discordUserId, player.playerName);
    const lastAnnouncedRank = Rank.safeParse(
      await redis.hget(rankUpMessagesKey, field),
    ).data;

    const heldRank = Rank.safeParse(player.rank).data;
    const rank = rankUpToAnnounce({
      heldRank,
      previousRank: before.rank,
      calculatedRank: rankData.rank,
      accountType: player.accountType,
      lastAnnouncedRank,
    });

    if (!rank) {
      return { outcome: 'none' };
    }

    await sendDiscordDirectMessage(
      buildRankUpMessage({
        playerName: player.playerName,
        heldRank,
        newRank: rank,
        totalPoints,
        pointsGained: totalPoints - before.totalPoints,
        nextRank: rankData.nextRank,
        publicUrl: clientConstants.publicUrl,
        sentAt: new Date(),
      }),
      player.discordUserId,
    );

    await redis.hset(rankUpMessagesKey, { [field]: rank });

    return { outcome: 'announced', rank };
  } catch (error) {
    return {
      outcome: 'failed',
      error: error instanceof Error ? error.message : 'unknown error',
    };
  }
}
