'use server';

import { authActionClient } from '@/app/safe-action';
import { returnValidationErrors } from 'next-safe-action';
import * as Sentry from '@sentry/nextjs';
import { ActionError } from '@/app/action-error';
import { fetchPlayerMeta } from '@/app/player/data-sources/fetch-player-meta';
import { ensureTrackedOnTemple } from '@/app/player/data-sources/ensure-tracked-on-temple';
import { AddPlayerSchema } from './add-player-schema';
import {
  createNewPlayer,
  findPlayerRegistration,
} from '@/lib/db/player-operations';
import { resolveDeclaredAccountType } from '@/app/player/utils/resolve-declared-account-type';
import { resolveAccountType } from '@/app/player/utils/resolve-account-type';

/**
 * Whether this name is still free, and if not, who has it.
 *
 * ⚠️ **Case-insensitive, because the unique index is** (`lower(player_name)`).
 * This used to call `getPlayerByName`, which compares the name exactly and is
 * also scoped to the caller — so a name registered with different casing, or by
 * a different member, passed the check and then failed the insert with a raw
 * `23505`. The member got a generic error at the very end of signup.
 *
 * `null` on a failed read, never "it's free": a database we cannot ask has not
 * told us the name is available, and letting the insert decide is exactly the
 * outcome above.
 */
async function findExistingRegistration(userId: string, playerName: string) {
  if (!userId) {
    return { status: 'unknown' } as const;
  }

  try {
    const existing = await findPlayerRegistration(playerName);

    if (!existing) {
      return { status: 'available' } as const;
    }

    return {
      status: existing.discordUserId === userId ? 'yours' : 'taken',
      playerName: existing.playerName,
    } as const;
  } catch (error) {
    Sentry.captureException(error);

    return { status: 'unknown' } as const;
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
      const registration = await findExistingRegistration(userId, playerName);

      if (registration.status !== 'available') {
        returnValidationErrors(AddPlayerSchema, {
          playerName: {
            _errors: [
              registration.status === 'yours'
                ? `You have already set up ${registration.playerName}.`
                : registration.status === 'taken'
                  ? `${registration.playerName} is already registered by another member. If that account is yours, ask a moderator to sort it out.`
                  : 'We could not check whether this name is already registered. Try again in a moment.',
            ],
          },
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
        // The URL is deliberately *not* pasted into this message. A validation
        // error renders as plain text, so a bare address here is something the
        // player has to select and copy; the form puts a real link next to the
        // group-name field instead.
        returnValidationErrors(AddPlayerSchema, {
          gimGroupName: {
            _errors: [
              `Your group isn't being tracked on TempleOSRS yet, so Temple still reads ${maybeFormattedPlayerName} as a main. Add your group to Temple's GIM tracking and try again — or pick "Unranked group ironman", which never appears there.`,
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
