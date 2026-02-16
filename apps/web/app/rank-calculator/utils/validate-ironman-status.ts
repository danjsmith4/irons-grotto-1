'use server';

import { isPlayerIronman, PlayerInfoResponse } from '@/app/schemas/temple-api';
import { clientConstants } from '@/config/constants.client';

async function getPlayerInfo(player: string) {
  const maybeFormattedPlayerName = encodeURIComponent(player);
  const playerInfoRequest = await fetch(
    `${clientConstants.temple.baseUrl}/api/player_info.php?player=${maybeFormattedPlayerName}`,
  );

  return playerInfoRequest.json() as Promise<PlayerInfoResponse>;
}

/**
 * Validates that a player's account type matches their intended rank
 * @param playerName - The player's RuneScape username
 * @param targetRank - The rank they're trying to achieve (optional)
 * @returns Promise<{isValid: boolean, isIronman: boolean}> - Validation result and account type
 */
export async function validateIronmanStatus(
  playerName: string,
): Promise<{ isValid: boolean }> {
  // If not cached, fetch from Temple API
  const info = await getPlayerInfo(playerName);

  if (!info) {
    // If we can't get Temple data, we can't verify account type
    return { isValid: false };
  }

  const gameMode = info.data['Game mode'];
  const gim = info.data.GIM;
  const isIronman = isPlayerIronman(gameMode, gim);

  return { isValid: isIronman };
}
