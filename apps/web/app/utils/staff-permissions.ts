import type { StaffRole } from '@/app/schemas/staff';

/**
 * The staff ladder, lowest to highest. Only the ordering is meaningful — the
 * numbers exist so "strictly below me" is one comparison rather than a table
 * of pairs.
 */
export const staffRoleOrder = {
  moderator: 1,
  admin: 2,
  deputy_owner: 3,
  owner: 4,
} as const satisfies Record<StaffRole, number>;

/**
 * The roles that carry elevated permissions on the site, and therefore the
 * only ones the admin dashboard hands out.
 *
 * Moderator is deliberately outside this set: it is standing in the clan chat,
 * not access to anything here. Keeping it out is also what makes the rule the
 * clan agreed on come out right — an admin has no elevated role beneath their
 * own, so an admin can promote nobody.
 */
export const elevatedStaffRoles = [
  'admin',
  'deputy_owner',
  'owner',
] as const satisfies readonly StaffRole[];

export type ElevatedStaffRole = (typeof elevatedStaffRoles)[number];

export function isElevatedStaffRole(
  role: StaffRole | null | undefined,
): role is ElevatedStaffRole {
  return Boolean(role) && elevatedStaffRoles.includes(role as ElevatedStaffRole);
}

/**
 * Who gets through the door. Admin, deputy owner and owner — a moderator is
 * not an elevated account and sees the dashboard no differently to anyone else
 * (which is to say, not at all).
 */
export function canAccessAdminDashboard(role: StaffRole | null | undefined) {
  return isElevatedStaffRole(role);
}

/**
 * Whether `actor` sits strictly above `target` on the ladder. A null role is
 * below everything, and equal roles never outrank each other — two owners
 * cannot demote one another.
 */
export function outranks(
  actor: StaffRole | null | undefined,
  target: StaffRole | null | undefined,
) {
  if (!actor) {
    return false;
  }

  return !target || staffRoleOrder[target] < staffRoleOrder[actor];
}

/**
 * The roles `actor` may hand out: every elevated role strictly below their own.
 *
 * - Owner    -> admin, deputy owner
 * - Deputy   -> admin
 * - Admin    -> nothing
 *
 * Nobody can grant their own role, so an owner cannot mint another owner from
 * here and the top of the ladder stays a deliberate, out-of-band decision.
 */
export function grantableStaffRoles(
  actor: StaffRole | null | undefined,
): ElevatedStaffRole[] {
  if (!canAccessAdminDashboard(actor)) {
    return [];
  }

  return elevatedStaffRoles.filter((role) => outranks(actor, role));
}

interface ManageMemberInput {
  actorRole: StaffRole | null | undefined;
  /** The role the member holds today, null if they are not staff. */
  targetRole: StaffRole | null | undefined;
  /** True when the member being edited is one of the actor's own accounts. */
  isSelf?: boolean;
}

/**
 * Whether `actor` may touch this member's staff role at all.
 *
 * Managing someone requires outranking them, so a deputy owner can act on an
 * admin but not on another deputy owner, and nobody can act on themselves —
 * an owner promoting their own alt would be the whole ladder's blind spot.
 */
export function canManageStaffRole({
  actorRole,
  targetRole,
  isSelf = false,
}: ManageMemberInput) {
  if (isSelf || !canAccessAdminDashboard(actorRole)) {
    return false;
  }

  return outranks(actorRole, targetRole);
}

type AssignStaffRoleInput = ManageMemberInput & {
  /** The role being written, or null to strip the member of their role. */
  nextRole: StaffRole | null;
};

/**
 * The single check both the dashboard UI and the server action ask.
 *
 * A grant has to name a role the actor may hand out; a revoke only has to
 * clear a role they already outrank. Setting the role a member already holds
 * is refused rather than treated as a no-op, so the audit trail never fills up
 * with changes that changed nothing.
 */
export function canAssignStaffRole({
  actorRole,
  targetRole,
  nextRole,
  isSelf = false,
}: AssignStaffRoleInput) {
  if (!canManageStaffRole({ actorRole, targetRole, isSelf })) {
    return false;
  }

  if (nextRole === (targetRole ?? null)) {
    return false;
  }

  if (nextRole === null) {
    return targetRole != null;
  }

  return grantableStaffRoles(actorRole).includes(nextRole as ElevatedStaffRole);
}
