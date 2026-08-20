'use server';

import { authActionClient } from '@/app/safe-action';
import { z } from 'zod';
import { PlayerName } from '@/app/schemas/player';
import { resolveTempleAccountType } from '@/app/schemas/temple-api';
import { fetchTemplePlayerStats } from '../../../data-sources/fetch-temple-player-stats';

/**
 * Resolves a game mode while the player is still filling the form, so the
 * account-type question only ever appears for the accounts that need it.
 *
 * Null means TempleOSRS could not settle it — it reports a main both for
 * actual mains and for group ironmen it has never been told about.
 */
export const fetchAccountTypeAction = authActionClient
  .metadata({ actionName: 'fetch-account-type' })
  .schema(z.object({ playerName: PlayerName }))
  .action(async ({ parsedInput: { playerName } }) => {
    const playerStats = await fetchTemplePlayerStats(playerName, false);

    if (!playerStats) {
      return { accountType: null };
    }

    return {
      accountType: resolveTempleAccountType(
        playerStats.info['Game mode'],
        playerStats.info.GIM,
      ),
    };
  });
