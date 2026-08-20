'use server';

import { z } from 'zod';
import { authActionClient } from '@/app/safe-action';
import { ActionError } from '@/app/action-error';
import {
  getManageableMember,
  getStaffIdentityForDiscordUser,
} from '@/lib/db/staff-operations';
import { canAccessAdminDashboard } from '@/app/utils/staff-permissions';
import { syncStaffDiscordRole } from '../utils/sync-staff-discord-role';

const SyncStaffDiscordRoleSchema = z.object({
  playerName: z.string().trim().min(1).max(12),
});

/**
 * Pushes a member's stored staff role onto Discord again, changing nothing
 * here.
 *
 * This exists because assigning a role that is already held is refused — it
 * would be an audit entry recording no change — which would otherwise leave a
 * failed Discord call with no way to retry from the app. It writes no audit
 * row of its own: repairing Discord is not a change of standing.
 */
export const syncStaffDiscordRoleAction = authActionClient
  .metadata({ actionName: 'sync-staff-discord-role' })
  .schema(SyncStaffDiscordRoleSchema)
  .action(async ({ parsedInput: { playerName }, ctx: { userId } }) => {
    const { role: actorRole } = await getStaffIdentityForDiscordUser(userId);

    if (!canAccessAdminDashboard(actorRole)) {
      throw new ActionError('You do not have access to the admin dashboard');
    }

    const target = await getManageableMember(playerName, actorRole, userId);

    if (target.status === 'player-not-found') {
      throw new ActionError(`No active member named "${playerName}"`);
    }

    if (target.status === 'forbidden') {
      throw new ActionError(
        'You cannot manage this member’s Discord roles. You can only manage members below your own role.',
      );
    }

    const discord = await syncStaffDiscordRole(
      target.discordUserId,
      target.staffRole,
    );

    if (discord.status === 'failed') {
      throw new ActionError('Discord could not be reached. Try again shortly.');
    }

    return { playerName: target.playerName, discord: discord.status };
  });
