'use server';

import { z } from 'zod';
import { authActionClient } from '@/app/safe-action';
import { PlayerName } from '@/app/schemas/player';
import { revalidatePath } from 'next/cache';
import { resetPlayerClaims } from '@/lib/db/player-operations';
import { fetchPlayerDetails } from '../../data-sources/fetch-player-details/fetch-player-details';

/**
 * Discards everything the player has asserted for themselves, and re-derives
 * the sheet from the data sources.
 *
 * This used to delete the Redis draft, which was the only place a player's own
 * answers lived. With autosave those answers are in the player record and in
 * `player_item_overrides`, so "delete my data" now means clearing exactly
 * those — the claims — and letting the next sync repopulate everything a
 * source can establish on its own.
 *
 * Genuinely destructive, and not recoverable: a notable item ticked because
 * Temple hasn't caught up, a proof link, a radiant oathplate nothing else can
 * see. The confirmation dialog in the nav bar is the only thing between a
 * member and losing them.
 */
export const deleteSubmissionDataAction = authActionClient
  .metadata({ actionName: 'delete-submission-data' })
  .schema(z.object({ playerName: PlayerName }))
  .action(async ({ parsedInput: { playerName }, ctx: { userId } }) => {
    await resetPlayerClaims(playerName, userId);

    revalidatePath(`/player/${playerName.toLowerCase()}`);

    // Return fresh player details with which to reset the form
    return fetchPlayerDetails(playerName, userId);
  });
