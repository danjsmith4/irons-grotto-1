'use server';

import { authActionClient } from '@/app/safe-action';
import { returnValidationErrors } from 'next-safe-action';
import * as Sentry from '@sentry/nextjs';
import { ActionError } from '@/app/action-error';
import { fetchPlayerMeta } from '../../../data-sources/fetch-player-meta';
import { ensureTrackedOnTemple } from '../../../data-sources/ensure-tracked-on-temple';
import { AddPlayerSchema } from './add-player-schema';
import { createNewPlayer, getPlayerByName } from '@/lib/db/player-operations';
import { clientConstants } from '@/config/constants.client';
import { resolveDeclaredAccountType } from '../../../utils/resolve-declared-account-type';
import { resolveAccountType } from '../../../utils/resolve-account-type';

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
      parsedInput: {
        joinDate,
        playerName,
        isMobileOnly,
        accountType,
        gimGroupName: gimGroupNameInput,
      },
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

      const [playerMeta, tracking] = await Promise.all([
        fetchPlayerMeta(playerName),
        // The form does this too, but the server never trusts that it did.
        // Already-tracked accounts cost one cheap read and no wait.
        ensureTrackedOnTemple(playerName),
      ]);

      const maybeFormattedPlayerName = playerMeta?.rsn ?? playerName;

      // Game mode, from the only source that can assert one: TempleOSRS.
      // Only when Temple cannot does the player's own answer come into it,
      // and a claimed group is confirmed back against Temple rather than
      // taken at face value.
      const resolution = await resolveAccountType(tracking.info);

      // Unresolved *and* undeclared means the question was never put to the
      // player — the form only asks when it has to. That is stored as null,
      // which is what makes the calculator ask on first load. It is
      // emphatically not a declaration of a main.
      const declared =
        resolution.status === 'resolved'
          ? ({
              status: 'resolved',
              accountType: resolution.accountType,
              gimGroupName: null,
            } as const)
          : accountType
            ? await resolveDeclaredAccountType(
                maybeFormattedPlayerName,
                accountType,
                gimGroupNameInput,
              )
            : ({
                status: 'resolved',
                accountType: null,
                gimGroupName: null,
              } as const);

      // A group Temple cannot see is never quietly downgraded to unranked —
      // the player is told what to do about it, and decides whether their
      // group is untracked or genuinely unranked.
      if (declared.status === 'group-not-tracked') {
        returnValidationErrors(AddPlayerSchema, {
          gimGroupName: {
            _errors: [
              `Your group isn't being tracked on TempleOSRS yet, so Temple still reads ${maybeFormattedPlayerName} as a main. Add your group at ${clientConstants.temple.gimTrackingUrl} and try again — or pick "Unranked group ironman", which never appears there.`,
            ],
          },
        });
      }

      // Mains are not turned away. The calculator is a personal progress
      // tracker and everyone gets one; what a main cannot do is apply for a
      // rank (`canApplyForRank`) or place in the clan rankings, which is
      // enforced where those actually happen rather than at the door.
      const { accountType: resolvedAccountType, gimGroupName } = declared;

      try {
        await createNewPlayer({
          playerName: maybeFormattedPlayerName,
          joinDate: joinDate.toISOString(),
          rank: 'Unranked', // Default rank for new players
          isMobileOnly,
          accountType: resolvedAccountType,
          gimGroupName,
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
