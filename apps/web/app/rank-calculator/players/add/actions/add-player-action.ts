'use server';

import { authActionClient } from '@/app/safe-action';
import { returnValidationErrors } from 'next-safe-action';
import * as Sentry from '@sentry/nextjs';
import { ActionError } from '@/app/action-error';
import { fetchPlayerMeta } from '../../../data-sources/fetch-player-meta';
import { fetchTemplePlayerStats } from '../../../data-sources/fetch-temple-player-stats';
import { AddPlayerSchema } from './add-player-schema';
import { createNewPlayer, getPlayerByName } from '@/lib/db/player-operations';

async function assertUniquePlayerRecord(userId: string, playerName: string) {
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

export const addPlayerAction = authActionClient
  .metadata({ actionName: 'add-player-to-account' })
  .schema(AddPlayerSchema)
  .action(
    async ({
      parsedInput: { joinDate, playerName, isMobileOnly },
      ctx: { userId },
    }) => {
      const isUsernameUnique = await assertUniquePlayerRecord(
        userId,
        playerName,
      );

      if (!isUsernameUnique) {
        returnValidationErrors(AddPlayerSchema, {
          playerName: { _errors: ['You have already registered this account'] },
        });
      }

      const [playerMeta, playerStats] = await Promise.all([
        fetchPlayerMeta(playerName),
        fetchTemplePlayerStats(playerName, false),
      ]);

      const maybeFormattedPlayerName =
        playerMeta?.rsn ?? playerStats?.info.Username ?? playerName;

      try {
        await createNewPlayer({
          playerName: maybeFormattedPlayerName,
          joinDate: joinDate.toISOString(),
          rank: 'Aspiring', // Default rank for new players
          isMobileOnly,
          discordUserId: userId,
        });
      } catch (error) {
        Sentry.captureException(error);
        throw new ActionError('Error creating player account record');
      }

      return { playerName: maybeFormattedPlayerName };
    },
  );
