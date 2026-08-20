import { auth } from '@/auth';
import {
  getStaffDirectory,
  getStaffIdentityForDiscordUser,
  getStaffRoleChanges,
  type StaffDirectoryEntry,
  type StaffRoleChangeEntry,
} from '@/lib/db/staff-operations';
import { canAccessAdminDashboard } from '@/app/utils/staff-permissions';
import type { StaffRole } from '@/app/schemas/staff';

export interface AdminDashboardData {
  /** The signed-in user's own standing, which decides what they may do. */
  viewerRole: StaffRole;
  viewerPlayerName: string | null;
  members: StaffDirectoryEntry[];
  history: StaffRoleChangeEntry[];
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

    const [members, history] = await Promise.all([
      getStaffDirectory(discordUserId),
      getStaffRoleChanges(),
    ]);

    return {
      success: true,
      data: {
        // Narrowed by `canAccessAdminDashboard` above.
        viewerRole: role as StaffRole,
        viewerPlayerName: playerName,
        members,
        history,
      },
    };
  } catch (error) {
    console.error('Failed to fetch admin dashboard:', error);

    return { success: false, error: String(error) };
  }
}
