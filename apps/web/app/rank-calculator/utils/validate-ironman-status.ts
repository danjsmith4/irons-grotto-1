'use server';

import { isPlayerIronman } from '@/app/schemas/temple-api';
import { redis } from '@/redis';
import { playerIronmanStatusKey } from '@/config/redis';
import { fetchTemplePlayerStats } from '../data-sources/fetch-temple-player-stats';

/**
 * Validates that a player's account type matches their intended rank
 * @param playerName - The player's RuneScape username
 * @param targetRank - The rank they're trying to achieve (optional)
 * @returns Promise<{isValid: boolean, isIronman: boolean}> - Validation result and account type
 */
export async function validateIronmanStatus(
  playerName: string,
  targetRank?: string,
): Promise<{ isValid: boolean; isIronman: boolean }> {
  const playerKey = playerName.toLowerCase();

  // First, check cached ironman status in Redis
  const cachedStatus = await redis.hget(playerIronmanStatusKey, playerKey);

  let isIronman: boolean;

  if (cachedStatus !== null) {
    isIronman = cachedStatus === 'true';
  } else {
    // If not cached, fetch from Temple API
    const templePlayerStats = await fetchTemplePlayerStats(playerName, false);

    if (!templePlayerStats) {
      // If we can't get Temple data, we can't verify account type
      return { isValid: false, isIronman: false };
    }

    const gameMode = templePlayerStats.info['Game mode'];
    const gim = templePlayerStats.info.GIM;
    isIronman = isPlayerIronman(gameMode, gim);

    // Cache the result for future use
    await redis.hset(playerIronmanStatusKey, {
      [playerKey]: isIronman.toString(),
    });
  }

  // Validate account type matches target rank
  if (targetRank) {
    // Main accounts can only get Looter rank
    if (!isIronman && targetRank !== 'Looter') {
      return { isValid: false, isIronman };
    }
    // Ironman accounts cannot get Looter rank (it's for mains only)
    if (isIronman && targetRank === 'Looter') {
      return { isValid: false, isIronman };
    }
  } else {
    // If no target rank specified, default behavior: only ironmen allowed
    if (!isIronman) {
      return { isValid: false, isIronman };
    }
  }

  return { isValid: true, isIronman };
}
