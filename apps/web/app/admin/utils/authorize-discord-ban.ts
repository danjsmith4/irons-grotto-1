import 'server-only';
import { ActionError } from '@/app/action-error';
import { getStaffIdentityForDiscordUser } from '@/lib/db/staff-operations';
import {
  canAccessAdminDashboard,
  canManageDiscordBan,
} from '@/app/utils/staff-permissions';

/**
 * The check every ban action runs, against the database rather than against
 * anything the client said.
 *
 * Both halves matter. The actor's own standing is re-read from their Discord
 * session, and the *target's* standing is read too — the dashboard renders
 * what it may do, but a member can be promoted between that render and the
 * click, and an admin banning the owner out of the server is not a mistake
 * there is any way back from.
 *
 * Returns the actor's clan name, which is what the ban's recorded reason
 * attributes it to.
 */
export async function authorizeDiscordBan(
  actorDiscordUserId: string,
  targetDiscordUserId: string,
): Promise<{ actorName: string }> {
  const { role: actorRole, playerName: actorPlayerName } =
    await getStaffIdentityForDiscordUser(actorDiscordUserId);

  if (!canAccessAdminDashboard(actorRole)) {
    throw new ActionError('You do not have access to the admin dashboard');
  }

  const { role: targetRole } = await getStaffIdentityForDiscordUser(
    targetDiscordUserId,
  );

  const allowed = canManageDiscordBan({
    actorRole,
    targetRole,
    isSelf: targetDiscordUserId === actorDiscordUserId,
  });

  if (!allowed) {
    throw new ActionError(
      targetDiscordUserId === actorDiscordUserId
        ? 'You cannot ban yourself.'
        : 'You cannot ban this member. They hold a staff role at or above your own.',
    );
  }

  // Falls back to the Discord id when the actor tracks no account here, so the
  // ban is still attributed to someone rather than to the bot.
  return { actorName: actorPlayerName ?? `Discord user ${actorDiscordUserId}` };
}
