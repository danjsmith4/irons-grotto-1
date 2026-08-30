import { auth } from '@/auth';
import {
  getStaffDirectory,
  getStaffIdentityForDiscordUser,
  getStaffRoleChanges,
  type StaffDirectoryEntry,
  type StaffRoleChangeEntry,
} from '@/lib/db/staff-operations';
import {
  getMembersBelowTotalLevel,
  type MemberBelowTotalLevel,
} from '@/lib/db/player-operations';
import { canAccessAdminDashboard } from '@/app/utils/staff-permissions';
import {
  resolveTotalLevelGrace,
  type TotalLevelGrace,
} from '@/app/utils/resolve-total-level-grace';
import { minimumJoinTotalLevel } from '@/config/clan-requirements';
import type { StaffRole } from '@/app/schemas/staff';

export interface AdminDashboardData {
  /** The signed-in user's own standing, which decides what they may do. */
  viewerRole: StaffRole;
  viewerPlayerName: string | null;
  members: StaffDirectoryEntry[];
  history: StaffRoleChangeEntry[];
  /**
   * Members who were already here when the minimum total level came in, with
   * where each stands against the grace deadline. Read-only: the pane informs
   * a decision, it does not take one.
   */
  belowTotalLevel: MemberBelowTotalLevelEntry[];
}

export interface MemberBelowTotalLevelEntry extends MemberBelowTotalLevel {
  grace: TotalLevelGrace;
}

/**
 * Everything the admin dashboard renders, for the signed-in user only.
 *
 * The access check lives here rather than only on the page, so a caller cannot
 * get the roster by reaching for the data source directly.
 */
export async function fetchAdminDashboard(): Promise<
  | { success: true; data: AdminDashboardData }
  | { success: false; error: string }
> {
  try {
    const session = await auth();
    const discordUserId = session?.user?.id;

    if (!discordUserId) {
      return { success: false, error: 'Not signed in' };
    }

    const { role, playerName } =
      await getStaffIdentityForDiscordUser(discordUserId);

    if (!canAccessAdminDashboard(role)) {
      return { success: false, error: 'Not an elevated account' };
    }

    const [members, history, belowTotalLevel] = await Promise.all([
      getStaffDirectory(discordUserId),
      getStaffRoleChanges(),
      getMembersBelowTotalLevel(minimumJoinTotalLevel),
    ]);

    // One `now` for the whole list, so two rows rendered from the same request
    // can never disagree about how many days are left.
    const now = new Date();

    return {
      success: true,
      data: {
        // Narrowed by `canAccessAdminDashboard` above.
        viewerRole: role as StaffRole,
        viewerPlayerName: playerName,
        members,
        history,
        belowTotalLevel: belowTotalLevel.map((member) => ({
          ...member,
          grace: resolveTotalLevelGrace(member.totalLevel, now),
        })),
      },
    };
  } catch (error) {
    console.error('Failed to fetch admin dashboard:', error);

    return { success: false, error: String(error) };
  }
}
