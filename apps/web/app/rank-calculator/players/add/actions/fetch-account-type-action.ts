'use server';

import { authActionClient } from '@/app/safe-action';
import { z } from 'zod';
import { PlayerName } from '@/app/schemas/player';
import { fetchTemplePlayerInfo } from '../../../data-sources/fetch-temple-player-info';
import { resolveAccountType } from '../../../utils/resolve-account-type';

/**
 * Resolves a game mode while the player is still filling the form, so the
 * account-type question only ever appears for the accounts that need it.
 *
 * Deliberately reads rather than registers: this runs on every keystroke, and
 * getting an account onto Temple means waiting for Temple to catch up. The
 * form calls `addToTempleAction` for that once it sees `isTrackedOnTemple:
 * false`, so the wait happens with something on screen explaining it.
 */
export const fetchAccountTypeAction = authActionClient
  .metadata({ actionName: 'fetch-account-type' })
  .schema(z.object({ playerName: PlayerName }))
  .action(async ({ parsedInput: { playerName } }) => {
    const templeInfo = await fetchTemplePlayerInfo(playerName);
    const resolution = await resolveAccountType(playerName, templeInfo);

    return {
      accountType:
        resolution.status === 'resolved' ? resolution.accountType : null,
      /**
       * Whether TempleOSRS has a record at all — a separate question from the
       * game mode, and the one thing here we can actually do something about.
       */
      isTrackedOnTemple: Boolean(templeInfo),
    };
  });
