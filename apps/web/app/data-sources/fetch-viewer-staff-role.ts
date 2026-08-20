import { auth } from '@/auth';
import { getStaffIdentityForDiscordUser } from '@/lib/db/staff-operations';
import type { StaffRole } from '@/app/schemas/staff';

/**
 * The signed-in user's staff role, and nothing else.
 *
 * Kept separate from `fetchAdminDashboard` because the nav bar asks this on
 * every page just to decide whether to show the Admin link — it should not be
 * pulling the whole roster to answer that.
 */
export async function fetchViewerStaffRole(): Promise<
  | { success: true; data: { staffRole: StaffRole | null } }
  | { success: false; error: string }
> {
  try {
    const session = await auth();
    const discordUserId = session?.user?.id;

    if (!discordUserId) {
      return { success: true, data: { staffRole: null } };
    }

    const { role } = await getStaffIdentityForDiscordUser(discordUserId);

    return { success: true, data: { staffRole: role } };
  } catch (error) {
    console.error('Failed to fetch viewer staff role:', error);

    return { success: false, error: String(error) };
  }
}
