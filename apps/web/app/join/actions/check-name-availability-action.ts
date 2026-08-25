'use server';

import { z } from 'zod';
import { authActionClient } from '@/app/safe-action';
import { PlayerName } from '@/app/schemas/player';
import { findPlayerRegistration } from '@/lib/db/player-operations';
import type { NameAvailability } from '../scan-types';

/**
 * Is this name already set up on the site?
 *
 * One indexed lookup, run the instant the player submits their name, so a
 * member who already has an account is told in a moment rather than after the
 * full scan — which registers them on TempleOSRS and can take ten seconds
 * before failing on something we knew at the start.
 *
 * ⚠️ **A convenience, not the guard.** `addPlayerAction` still refuses a
 * duplicate, and it has to: the client is never trusted, and two tabs can pass
 * this check a second apart. The database's unique index on
 * `lower(player_name)` is the real enforcement. This exists to save the member
 * the wait, not to replace anything.
 */
export const checkNameAvailabilityAction = authActionClient
  .metadata({ actionName: 'join-check-name-availability' })
  .schema(z.object({ playerName: PlayerName }))
  .action(
    async ({
      parsedInput: { playerName },
      ctx: { userId },
    }): Promise<NameAvailability> => {
      const existing = await findPlayerRegistration(playerName);

      if (!existing) {
        return { status: 'available' };
      }

      return {
        // The stored casing, not what was typed — it is what the link has to
        // use, and it is how the member will recognise their own account.
        playerName: existing.playerName,
        status: existing.discordUserId === userId ? 'yours' : 'taken',
      };
    },
  );
