'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { authActionClient } from '@/app/safe-action';
import { ActionError } from '@/app/action-error';
import {
  clanEventTypes,
  defaultClanEventName,
  findClanEventMetric,
  nextClanEventType,
} from '@/config/clan-events';
import { canAccessAdminDashboard } from '@/app/utils/staff-permissions';
import { getStaffIdentityForDiscordUser } from '@/lib/db/staff-operations';
import {
  getClanEventById,
  getLatestClanEvent,
  getUpcomingClanEvent,
  insertClanEvent,
} from '@/lib/db/clan-event-operations';
import { nextClanEventWindow } from '@/app/utils/clan-event-schedule';
import { createTempleCompetition } from '@/app/data-sources/create-temple-competition';

const CreateClanEventSchema = z.object({
  /**
   * The skill or boss. Everything else about the event — its type, its start,
   * its end, the linked group — is decided by the rules, not by the caller.
   */
  metricId: z.number().int(),
  /**
   * What the client believes the type is. Sent so a stale form cannot silently
   * create the wrong kind of event: it is checked against the alternation, not
   * used in place of it.
   */
  expectedType: z.enum(clanEventTypes),
  /** Optional override of the generated "<Metric> SOTW" name. */
  name: z.string().trim().min(3).max(60).optional(),
});

/**
 * Creates the next SOTW/BOTW on TempleOSRS and records it here.
 *
 * Nothing the client sends decides the shape of the event. The type comes from
 * the alternation, the dates come from the fixed Friday slot, and the group
 * link and participant sync are constants — the caller only picks the skill or
 * boss. All of it is re-derived here because the form may have been open since
 * before the last event was created.
 *
 * Temple is called first and the row is written from its reply, so the stored
 * id is always a competition that exists. The reverse order would leave a row
 * pointing at nothing whenever Temple refused.
 */
export const createClanEventAction = authActionClient
  .metadata({ actionName: 'create-clan-event' })
  .schema(CreateClanEventSchema)
  .action(
    async ({
      parsedInput: { metricId, expectedType, name },
      ctx: { userId },
    }) => {
      const { role, playerName: actorPlayerName } =
        await getStaffIdentityForDiscordUser(userId);

      if (!canAccessAdminDashboard(role)) {
        throw new ActionError('You do not have access to the admin dashboard');
      }

      const now = new Date();
      const latest = await getLatestClanEvent();
      const type = nextClanEventType(latest?.type ?? null);

      if (type !== expectedType) {
        throw new ActionError(
          `The next event is a ${type.toUpperCase()}, not a ${expectedType.toUpperCase()}. Reload the page — someone may have created one since you opened this form.`,
        );
      }

      // The one-ahead rule, enforced where it counts. The form disables itself
      // on the same condition, but it is looking at a copy of the queue.
      const queued = await getUpcomingClanEvent(now);

      if (queued) {
        throw new ActionError(
          `“${queued.name}” is already scheduled. Only one event can be queued ahead of the one running.`,
        );
      }

      const metric = findClanEventMetric(type, metricId);

      if (!metric) {
        throw new ActionError(
          'That is not a skill or boss we run events on. Reload the page and pick again.',
        );
      }

      const { startsAt, endsAt } = nextClanEventWindow(
        now,
        latest?.startsAt ?? null,
      );

      const competitionName = name ?? defaultClanEventName(type, metric.name);

      const created = await createTempleCompetition({
        name: competitionName,
        metricId: metric.id,
        startsAt,
        endsAt,
      });

      if (!created.success) {
        throw new ActionError(created.error);
      }

      // Temple can return an id we already hold if a create was retried after
      // a timeout. Recording it twice would fail the primary key; treating it
      // as done is the truthful outcome.
      const existing = await getClanEventById(created.competitionId);

      if (existing) {
        revalidatePath('/admin');

        return {
          competitionId: existing.id,
          name: existing.name,
          type: existing.type,
          alreadyRecorded: true,
          hasCompetitionKey: !!existing.competitionKey,
        };
      }

      const event = await insertClanEvent({
        id: created.competitionId,
        type,
        name: competitionName,
        metricId: metric.id,
        metricName: metric.name,
        startsAt,
        endsAt,
        competitionKey: created.competitionKey,
        createdByPlayerName: actorPlayerName,
        createdByDiscordId: userId,
      });

      revalidatePath('/admin');
      revalidatePath('/dashboard');

      return {
        competitionId: event.id,
        name: event.name,
        type: event.type,
        alreadyRecorded: false,
        hasCompetitionKey: !!event.competitionKey,
      };
    },
  );
