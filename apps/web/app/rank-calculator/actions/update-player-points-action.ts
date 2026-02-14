'use server';

import { updatePlayerPoints } from '@/lib/db/player-operations';

export async function updatePlayerPointsAction(
  playerName: string,
  points: number,
) {
  try {
    await updatePlayerPoints(playerName, points);
    return { success: true };
  } catch (error) {
    console.error(`Failed to update points for player ${playerName}:`, error);
    return { success: false, error: String(error) };
  }
}
