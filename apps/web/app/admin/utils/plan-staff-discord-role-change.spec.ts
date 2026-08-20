import { staffRoleDiscordRoles } from '@/config/discord-roles';
import { planStaffDiscordRoleChange } from './plan-staff-discord-role-change';

const {
  moderator: MODERATOR,
  admin: ADMIN,
  deputy_owner: DEPUTY,
  owner: OWNER,
} = staffRoleDiscordRoles;

/** A points-rank role, which none of this should ever touch. */
const BEAST = '1135475800989245472';

describe('planStaffDiscordRoleChange', () => {
  it('grants the role to a member who has none', () => {
    expect(planStaffDiscordRoleChange([BEAST], 'admin')).toEqual({
      remove: [],
      add: ADMIN,
    });
  });

  /**
   * A player holds exactly one staff role here, so Discord must say exactly
   * that — a promotion is a swap, not an addition.
   */
  it('swaps the old role for the new one on a promotion', () => {
    expect(planStaffDiscordRoleChange([BEAST, MODERATOR], 'admin')).toEqual({
      remove: [MODERATOR],
      add: ADMIN,
    });
  });

  it('strips every staff role on a revoke', () => {
    expect(planStaffDiscordRoleChange([BEAST, DEPUTY], null)).toEqual({
      remove: [DEPUTY],
      add: null,
    });
  });

  it('leaves a member who holds no staff role alone on a revoke', () => {
    expect(planStaffDiscordRoleChange([BEAST], null)).toEqual({
      remove: [],
      add: null,
    });
  });

  /** Re-syncing an already-correct member should make no calls at all. */
  it('asks for nothing when Discord already agrees', () => {
    expect(planStaffDiscordRoleChange([BEAST, OWNER], 'owner')).toEqual({
      remove: [],
      add: null,
    });
  });

  it('cleans up a member who somehow holds several staff roles', () => {
    const plan = planStaffDiscordRoleChange(
      [MODERATOR, ADMIN, DEPUTY, OWNER],
      'admin',
    );

    expect(plan.add).toBeNull();
    expect(plan.remove).toEqual(
      expect.arrayContaining([MODERATOR, DEPUTY, OWNER]),
    );
    expect(plan.remove).not.toContain(ADMIN);
  });

  it('never touches a points-rank role', () => {
    const plan = planStaffDiscordRoleChange([BEAST, OWNER], null);

    expect(plan.remove).not.toContain(BEAST);
  });

  it('maps admin to the Discord role named "Staff", which the server has instead of "Administrator"', () => {
    expect(staffRoleDiscordRoles.admin).toBe('829386451624001539');
  });
});
