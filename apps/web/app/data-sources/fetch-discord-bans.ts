import { auth } from '@/auth';
import {
  getClanIdentitiesForDiscordUsers,
  getStaffIdentityForDiscordUser,
} from '@/lib/db/staff-operations';
import {
  canAccessAdminDashboard,
  canManageDiscordBan,
} from '@/app/utils/staff-permissions';
import { listGuildBans, type GuildBan } from '@/app/admin/utils/discord-bans';

export interface DiscordBanEntry extends GuildBan {
  /** Clan accounts this Discord user tracks here, if any. */
  playerNames: string[];
  /** Whether the signed-in moderator may lift this ban. */
  canManage: boolean;
}

export interface DiscordBansData {
  bans: DiscordBanEntry[];
}

/**
 * The guild's ban list, annotated for whoever is signed in.
 *
 * Kept out of `fetchAdminDashboard` on purpose: this one talks to Discord, and
 * the dashboard redirects away when its fetch fails. A Discord outage should
 * cost the ban pane, not the whole page — so the failure is returned and the
 * pane renders it.
 */
export async function fetchDiscordBans(): Promise<
  { success: true; data: DiscordBansData } | { success: false; error: string }
> {
  try {
    const session = await auth();
    const discordUserId = session?.user?.id;

    if (!discordUserId) {
      return { success: false, error: 'Not signed in' };
    }

    const { role: viewerRole } =
      await getStaffIdentityForDiscordUser(discordUserId);

    if (!canAccessAdminDashboard(viewerRole)) {
      return { success: false, error: 'Not an elevated account' };
    }

    const bans = await listGuildBans();
    const identities = await getClanIdentitiesForDiscordUsers(
      bans.map((ban) => ban.id),
    );

    return {
      success: true,
      data: {
        bans: bans
          .map((ban) => {
            const identity = identities.get(ban.id);

            return {
              ...ban,
              playerNames: identity?.playerNames ?? [],
              canManage: canManageDiscordBan({
                actorRole: viewerRole,
                targetRole: identity?.staffRole ?? null,
                isSelf: ban.id === discordUserId,
              }),
            };
          })
          // Discord returns these ordered by user id, which is the order the
          // accounts were created in and means nothing here. Name order is at
          // least the order a moderator would look them up in.
          .sort((a, b) => a.displayName.localeCompare(b.displayName)),
      },
    };
  } catch (error) {
    console.error('Failed to fetch Discord bans:', error);

    return { success: false, error: String(error) };
  }
}
