'use server';

import { authActionClient } from '@/app/safe-action';
import { z } from 'zod';
import { PlayerName } from '@/app/schemas/player';
import { ensureTrackedOnTemple } from '@/app/player/data-sources/ensure-tracked-on-temple';
import { resolveAccountType } from '@/app/player/utils/resolve-account-type';

/**
 * Gets an account onto TempleOSRS during signup.
 *
 * Split out from the keystroke probe because it deliberately waits — Temple
 * queues an account rather than returning it — so there is a few seconds of
 * dead time the form shows the player rather than hiding.
 *
 * Re-resolving the game mode afterwards is a bonus, not the point: the point
 * is that everything the calculator scores comes from Temple, so an untracked
 * member has nothing to be scored on.
 */
export const addToTempleAction = authActionClient
  .metadata({ actionName: 'add-player-to-temple' })
  .schema(z.object({ playerName: PlayerName }))
  .action(async ({ parsedInput: { playerName } }) => {
    const { isTracked, info } = await ensureTrackedOnTemple(playerName);
    const resolution = await resolveAccountType(info);

    return {
      isTracked,
      accountType:
        resolution.status === 'resolved' ? resolution.accountType : null,
    };
  });
