'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { authActionClient } from '@/app/safe-action';
import { ActionError } from '@/app/action-error';
import { StaffRole } from '@/app/schemas/staff';
import {
  getStaffIdentityForDiscordUser,
  setPlayerStaffRole,
} from '@/lib/db/staff-operations';
import { canAccessAdminDashboard } from '@/app/utils/staff-permissions';
import { syncStaffDiscordRole } from '../utils/sync-staff-discord-role';

const SetStaffRoleSchema = z.object({
  playerName: z.string().trim().min(1).max(12),
  /** Null strips the member of the role they hold. */
  role: StaffRole.nullable(),
});

/**
 * Grants or revokes a staff role from the admin dashboard.
 *
 * The dashboard has already worked out what the actor may do, but none of that
 * is trusted here: the actor's own role is read from the database against
 * their Discord session, and the ladder is checked a second time inside
 * `setPlayerStaffRole`'s transaction against the target's current role. The
 * client only ever says *what* it wants, never who it is.
 */
export const setStaffRoleAction = authActionClient
  .metadata({ actionName: 'set-staff-role' })
  .schema(SetStaffRoleSchema)
  .action(async ({ parsedInput: { playerName, role }, ctx: { userId } }) => {
    const { role: actorRole, playerName: actorPlayerName } =
      await getStaffIdentityForDiscordUser(userId);

    if (!canAccessAdminDashboard(actorRole)) {
      throw new ActionError('You do not have access to the admin dashboard');
    }

    const result = await setPlayerStaffRole({
      playerName,
      nextRole: role,
      actorRole,
      actorDiscordUserId: userId,
      actorPlayerName,
    });

    if (result.status === 'player-not-found') {
      throw new ActionError(`No active member named "${playerName}"`);
    }

    if (result.status === 'forbidden') {
      throw new ActionError(
        'You cannot change this member’s role. You can only assign roles below your own.',
      );
    }

    // The database is the source of truth and the write has already landed, so
    // a Discord outage must not roll the promotion back — it is reported to
    // the actor instead, who can re-sync from the same menu once it clears.
    const discord = await syncStaffDiscordRole(result.discordUserId, role);

    revalidatePath('/admin');
    revalidatePath('/dashboard');

    return {
      playerName: result.playerName,
      oldRole: result.oldRole,
      newRole: role,
      discord: discord.status,
    };
  });
