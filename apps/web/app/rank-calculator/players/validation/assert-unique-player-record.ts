'use server';

import { getPlayerByName } from '@/lib/db/player-operations';
import * as Sentry from '@sentry/nextjs';

export async function assertUniquePlayerRecord(
  userId: string,
  playerName: string,
) {
  if (!userId) {
    return false;
  }

  try {
    const existingPlayer = await getPlayerByName(playerName, userId);
    return !existingPlayer; // Return true if player doesn't exist (unique)
  } catch (error) {
    Sentry.captureException(error);
    return false;
  }
}
