'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { authActionClient } from '@/app/safe-action';
import { ActionError } from '@/app/action-error';
import { canAccessAdminDashboard } from '@/app/utils/staff-permissions';
import {
  getElevatedStaffCandidates,
  getStaffIdentityForDiscordUser,
} from '@/lib/db/staff-operations';
import {
  getClanEventDuty,
  setClanEventDuty,
} from '@/lib/db/clan-event-duty-operations';
import {
  getClanEvents,
  getLatestClanEvent,
  getUpcomingClanEvent,
} from '@/lib/db/clan-event-operations';
import { nextClanEventType } from '@/config/clan-events';
import { nextClanEventWindow } from '@/app/utils/clan-event-schedule';
import { selectClanEventPicker } from '@/app/utils/select-clan-event-picker';
import { pickEventDutyStaff } from '@/app/utils/pick-event-duty-staff';
import { buildEventDutyMessage } from '@/app/utils/build-event-duty-message';
import { sendDiscordMessage } from '@/app/rank-calculator/utils/send-discord-message';
import { clanEventDutyChannelId } from '@/config/clan-events';
import { clientConstants } from '@/config/constants.client';

/**
 * Rolls a member of staff onto event-setup duty and tells the clan.
 *
 * The pool is the elevated accounts — the only ones who can reach `/admin` and
 * therefore the only ones who can act on it. Whoever is already on duty is
 * excluded so that pressing the button again actually rerolls.
 *
 * The message is the point of the feature: it carries the deadline, which type
 * of event is next, and who to ask for the pick, so nobody has to come back
 * here to find out what they have been volunteered for.
 */
export const pickEventDutyAction = authActionClient
  .metadata({ actionName: 'pick-event-duty' })
  .schema(z.object({}))
  .action(async ({ ctx: { userId } }) => {
    const { role, playerName: actorPlayerName } =
      await getStaffIdentityForDiscordUser(userId);

    if (!canAccessAdminDashboard(role)) {
      throw new ActionError('You do not have access to the admin dashboard');
    }

    const now = new Date();

    const [candidates, current, latest, queued, events] = await Promise.all([
      getElevatedStaffCandidates(),
      getClanEventDuty(),
      getLatestClanEvent(),
      getUpcomingClanEvent(now),
      getClanEvents(20),
    ]);

    if (candidates.length === 0) {
      throw new ActionError(
        'There is no elevated staff account to put on duty.',
      );
    }

    // Nothing to be on duty for — the next event is already booked.
    if (queued) {
      throw new ActionError(
        `“${queued.name}” is already scheduled, so there is nothing to set up yet.`,
      );
    }

    const chosen = pickEventDutyStaff(candidates, current?.playerName ?? null);

    if (!chosen) {
      throw new ActionError('Could not pick anyone for duty.');
    }

    const type = nextClanEventType(latest?.type ?? null);
    const { startsAt } = nextClanEventWindow(now, latest?.startsAt ?? null);

    // Recorded before Discord is called: the roll is the decision, and a
    // Discord outage must not silently drop it and hand the next press a
    // different name.
    await setClanEventDuty({
      playerName: chosen.playerName,
      discordUserId: chosen.discordUserId,
      eventType: type,
      startsAt: startsAt.toISOString(),
      rolledByPlayerName: actorPlayerName,
    });

    let discord: 'sent' | 'failed' = 'sent';

    try {
      await sendDiscordMessage(
        {
          content: buildEventDutyMessage({
            discordUserId: chosen.discordUserId,
            type,
            startsAt,
            picker: selectClanEventPicker(events, type, now),
            adminUrl: `${clientConstants.publicUrl}/admin`,
            now,
          }),
        },
        clanEventDutyChannelId,
      );
    } catch (error) {
      console.error('Failed to post the event duty message:', error);
      discord = 'failed';
    }

    revalidatePath('/admin');

    return { playerName: chosen.playerName, type, discord };
  });
