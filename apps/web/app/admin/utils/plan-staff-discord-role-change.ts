import { staffRoleDiscordRoles } from '@/config/discord-roles';
import type { StaffRole } from '@/app/schemas/staff';

const staffDiscordRoleIds = Object.values(staffRoleDiscordRoles);

export interface StaffDiscordRolePlan {
  /** Staff roles to take away, which is every one they should not hold. */
  remove: string[];
  /** The role to grant, or null if they already hold it or should hold none. */
  add: string | null;
}

/**
 * What Discord should be told, given the roles a member holds now and the
 * staff role they should end up with.
 *
 * `players.staff_role` is the source of truth, so the rule is that Discord
 * ends up saying exactly that and nothing more: every other staff role is
 * stripped. A promotion from moderator to admin therefore takes Moderator away
 * as well as granting Staff, and a revoke leaves none of the four.
 *
 * Deliberately additive in every other respect — a staff role sits alongside
 * the points-rank role, so nothing here touches those.
 *
 * Kept apart from the calls that carry it out so the rule is testable without
 * a Discord server, and so it stays out of `server-only`.
 */
export function planStaffDiscordRoleChange(
  currentRoleIds: readonly string[],
  role: StaffRole | null,
): StaffDiscordRolePlan {
  const grantedRoleId = role ? staffRoleDiscordRoles[role] : null;

  return {
    remove: staffDiscordRoleIds.filter(
      (roleId) => roleId !== grantedRoleId && currentRoleIds.includes(roleId),
    ),
    add:
      grantedRoleId && !currentRoleIds.includes(grantedRoleId)
        ? grantedRoleId
        : null,
  };
}
