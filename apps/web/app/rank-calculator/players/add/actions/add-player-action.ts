'use server';

import { authActionClient } from '@/app/safe-action';
import { returnValidationErrors } from 'next-safe-action';
import * as Sentry from '@sentry/nextjs';
import { ActionError } from '@/app/action-error';
import { fetchPlayerMeta } from '../../../data-sources/fetch-player-meta';
import { fetchTemplePlayerStats } from '../../../data-sources/fetch-temple-player-stats';
import { AddPlayerSchema } from './add-player-schema';
import { validateIronmanStatus } from '../../../utils/validate-ironman-status';
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
      parsedInput: { joinDate, playerName, isMobileOnly, unrankedGIMOverride },
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

      // Always validate the player's account type to get their current status
      const validation = await validateIronmanStatus(maybeFormattedPlayerName);

      console.debug(`${playerName}'s gamemode: ${validation.isValid}`);

      if (unrankedGIMOverride) {
        // If user claims this is an unranked GIM, but the account shows as ironman, that's incorrect
        if (validation.isValid) {
          returnValidationErrors(AddPlayerSchema, {
            unrankedGIMOverride: {
              _errors: [
                'This account appears to be an ironman account, not a main account. Uncheck the "Unranked GIM" override or verify the correct player name.',
              ],
            },
          });
        }
        console.debug(`${playerName} validation skipped due to unranked GIM override - confirmed as main account`);
      } else {
        // Normal validation - account must be ironman
        if (!validation.isValid) {
          returnValidationErrors(AddPlayerSchema, {
            playerName: {
              _errors: [
                'Only ironman accounts can be registered in this clan. Main accounts are not eligible for standard clan ranks.',
              ],
            },
          });
        }
      }

      try {
        await createNewPlayer({
          playerName: maybeFormattedPlayerName,
          joinDate: joinDate.toISOString(),
          rank: 'Unranked', // Default rank for new players
          isMobileOnly,
          discordUserId: userId,
        });
      } catch (error) {
        Sentry.captureException(error);

        // Check if it's a unique constraint violation (player already exists)
        if (error && typeof error === 'object' && 'code' in error) {
          // PostgreSQL unique constraint violation code
          if (error.code === '23505') {
            throw new ActionError(
              'A player with this name already exists. Please choose a different player name.',
            );
          }
        }

        // Check for common database error patterns in the message
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        if (
          errorMessage.toLowerCase().includes('unique') ||
          errorMessage.toLowerCase().includes('duplicate') ||
          errorMessage.toLowerCase().includes('already exists')
        ) {
          throw new ActionError(
            'A player with this name already exists. Please choose a different player name.',
          );
        }

        // Generic error for other cases
        throw new ActionError('Error creating player account record');
      }

      return { playerName: maybeFormattedPlayerName };
    },
  );
