'use server';

import { authActionClient } from '@/app/safe-action';
import { PlayerName } from '@/app/schemas/player';
import { updatePlayerEditableFields } from '@/lib/db/player-operations';
import { PlayerEditableSchema } from '../player-editable-schema';

/**
 * Persists a change the player just made, as it is made.
 *
 * **Partial by design.** `saveDraftRankSubmissionAction`, which this replaces,
 * took the entire form on every call — which is why every page load rewrote
 * every field. Autosave sends only what actually changed, so two edits in
 * different panels can't clobber each other, and a request carries a handful
 * of keys rather than the whole sheet.
 */
export const updatePlayerStateAction = authActionClient
  .metadata({ actionName: 'update-player-state' })
  .bindArgsSchemas<[playerName: typeof PlayerName]>([PlayerName])
  .schema(PlayerEditableSchema)
  .action(
    async ({
      parsedInput,
      bindArgsParsedInputs: [playerName],
      ctx: { userId },
    }) => {
      await updatePlayerEditableFields(playerName, parsedInput, userId);

      return { success: true };
    },
  );
