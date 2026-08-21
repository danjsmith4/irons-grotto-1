'use server';

import { z } from 'zod';
import { authActionClient } from '@/app/safe-action';
import { PlayerName } from '@/app/schemas/player';
import { updatePlayerEditableFields } from '@/lib/db/player-operations';
import { userDraftRankSubmissionKey } from '@/config/redis';
import { redis } from '@/redis';
import { RankCalculatorSchema } from '../submit-rank-calculator-validation';

/**
 * The fields a player may set for themselves.
 *
 * Deliberately a **pick**, not the whole schema. `RankCalculatorSchema` also
 * carries stats (`ehb`, `totalLevel`, clue counts) that are read-only in the
 * UI and owned by TempleOSRS/WikiSync, plus `rank` and `points`, which are
 * decided server-side. None of those may be asserted by the browser — the form
 * renders them, it does not get a vote on them.
 */
export const PlayerEditableSchema = RankCalculatorSchema.pick({
  acquiredItems: true,
  achievementDiaries: true,
  combatAchievementTier: true,
  tzhaarCape: true,
  hasBloodTorva: true,
  hasDizanasQuiver: true,
  hasRadiantOathplate: true,
  hasAchievementDiaryCape: true,
  proofLink: true,
}).partial();

export type PlayerEditableFields = z.infer<typeof PlayerEditableSchema>;

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

      // The Redis draft is no longer read by the calculator — Postgres above is
      // authoritative — but a rank submission is still a literal `COPY` of it,
      // so letting it go stale would make members submit sheets that don't
      // match what they can see.
      //
      // Temporary, and the whole reason it is a shim rather than a design: the
      // next change snapshots submissions from the player record instead, at
      // which point the draft has no readers left and the key goes.
      try {
        const draftKey = userDraftRankSubmissionKey(userId, playerName);
        const draft = await redis.json.get<Record<string, unknown>>(draftKey);

        if (draft) {
          await redis.json.set(draftKey, '$', { ...draft, ...parsedInput });
        }
      } catch (error) {
        console.error(
          `Failed to mirror autosave into the draft for ${playerName}:`,
          error,
        );
      }

      return { success: true };
    },
  );
