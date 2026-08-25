'use server';

import { z } from 'zod';
import { authActionClient } from '@/app/safe-action';
import { PlayerName } from '@/app/schemas/player';
import { fetchTemplePlayerCollectionLog } from '@/app/player/data-sources/fetch-player-details/fetch-temple-collection-log';
import type { CollectionLogScan } from '../scan-types';

/**
 * The player's collection log as TempleOSRS holds it.
 *
 * This is the step that can block: Temple only has a log if the player has
 * pressed sync in the collection log interface in game, and a log it has not
 * seen for a while is worse than none — it looks like real data and scores
 * lower than the truth. The count comes back here; whether it is *behind* is
 * settled against the hiscores count from the Temple step, which is the only
 * other place that number exists.
 */
export const scanCollectionLogAction = authActionClient
  .metadata({ actionName: 'join-scan-collection-log' })
  .schema(z.object({ playerName: PlayerName }))
  .action(
    async ({ parsedInput: { playerName } }): Promise<CollectionLogScan> => {
      const log = await fetchTemplePlayerCollectionLog(playerName);

      return {
        hasCollectionLog: Boolean(log),
        clogSlots: log?.total_collections_finished ?? null,
        clogTotal: log?.total_collections_available ?? null,
        hasFangKit:
          log?.items.some(({ name }) => name === 'Cursed phalanx') ?? false,
        // The ironman rate, matching the EHB and EHP shown beside it.
        ehc: log?.ehc_im ?? null,
      };
    },
  );
