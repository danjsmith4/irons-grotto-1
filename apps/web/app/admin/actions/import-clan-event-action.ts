'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { authActionClient } from '@/app/safe-action';
import { ActionError } from '@/app/action-error';
import { clanEventTypeForMetric } from '@/config/clan-events';
import { canAccessAdminDashboard } from '@/app/utils/staff-permissions';
import { getStaffIdentityForDiscordUser } from '@/lib/db/staff-operations';
import {
  getClanEventById,
  insertClanEvent,
} from '@/lib/db/clan-event-operations';
import { fetchTempleCompetition } from '@/app/data-sources/fetch-temple-competition';

const ImportClanEventSchema = z.object({
  competitionId: z.number().int().positive(),
  /**
   * The competition's edit key, if whoever made it still has it. Optional: an
   * imported event is readable without one, it just cannot be edited from
   * here afterwards.
   */
  competitionKey: z.string().trim().max(64).optional(),
});

/**
 * Adopts a competition that already exists on TempleOSRS.
 *
 * This is what bootstraps the alternation. The site works out whether the next
 * event is a skill week or a boss week from the last one recorded, and the
 * clan has been running these long before there was a table for them — so the
 * competition currently in progress has to be brought in once, by id, or the
 * first event created here would guess.
 *
 * Everything is taken from Temple rather than from the form: the name, the
 * metric, the dates, and the type (Temple's skill and boss ids share one
 * space, so the metric alone says which kind of event it was).
 */
export const importClanEventAction = authActionClient
  .metadata({ actionName: 'import-clan-event' })
  .schema(ImportClanEventSchema)
  .action(
    async ({
      parsedInput: { competitionId, competitionKey },
      ctx: { userId },
    }) => {
      const { role, playerName: actorPlayerName } =
        await getStaffIdentityForDiscordUser(userId);

      if (!canAccessAdminDashboard(role)) {
        throw new ActionError('You do not have access to the admin dashboard');
      }

      const existing = await getClanEventById(competitionId);

      if (existing) {
        throw new ActionError(
          `“${existing.name}” is already recorded here.`,
        );
      }

      const competition = await fetchTempleCompetition(competitionId);

      if (!competition) {
        throw new ActionError(
          `TempleOSRS has no competition ${competitionId}, or it could not be read.`,
        );
      }

      const type = clanEventTypeForMetric(competition.metricId);

      if (!type) {
        throw new ActionError(
          `That competition tracks “${competition.metricName}”, which is not a skill or boss we run events on.`,
        );
      }

      const event = await insertClanEvent({
        id: competition.id,
        type,
        name: competition.name,
        metricId: competition.metricId,
        metricName: competition.metricName,
        startsAt: competition.startsAt,
        endsAt: competition.endsAt,
        // An empty box is "I don't have it", not an empty key.
        competitionKey: competitionKey?.length ? competitionKey : null,
        createdByPlayerName: actorPlayerName,
        createdByDiscordId: userId,
      });

      revalidatePath('/admin');
      revalidatePath('/dashboard');

      return {
        competitionId: event.id,
        name: event.name,
        type: event.type,
        hasCompetitionKey: !!event.competitionKey,
      };
    },
  );
