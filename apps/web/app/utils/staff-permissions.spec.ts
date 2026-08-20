import {
  canAccessAdminDashboard,
  canAssignStaffRole,
  canManageStaffRole,
  grantableStaffRoles,
  outranks,
} from './staff-permissions';

describe('canAccessAdminDashboard', () => {
  it.each(['admin', 'deputy_owner', 'owner'] as const)('admits %s', (role) => {
    expect(canAccessAdminDashboard(role)).toBe(true);
  });

  /**
   * Moderator is standing in the clan chat, not access to anything here.
   */
  it('turns away a moderator', () => {
    expect(canAccessAdminDashboard('moderator')).toBe(false);
  });

  it.each([null, undefined])('turns away a member with %s role', (role) => {
    expect(canAccessAdminDashboard(role)).toBe(false);
  });
});

describe('outranks', () => {
  it('places a higher role above a lower one', () => {
    expect(outranks('owner', 'deputy_owner')).toBe(true);
    expect(outranks('deputy_owner', 'admin')).toBe(true);
    expect(outranks('admin', 'moderator')).toBe(true);
  });

  it('never lets equal roles outrank each other', () => {
    expect(outranks('owner', 'owner')).toBe(false);
  });

  it('places everyone above a member with no role', () => {
    expect(outranks('admin', null)).toBe(true);
  });

  it('places a member with no role above nobody', () => {
    expect(outranks(null, null)).toBe(false);
  });
});

/**
 * The rule the clan settled on: you may only hand out a role below your own,
 * and only the elevated roles are handed out here at all.
 */
describe('grantableStaffRoles', () => {
  it('lets an owner grant everything short of owner', () => {
    expect(grantableStaffRoles('owner')).toEqual(['admin', 'deputy_owner']);
  });

  it('lets a deputy owner grant admin', () => {
    expect(grantableStaffRoles('deputy_owner')).toEqual(['admin']);
  });

  it('leaves an admin with nobody to promote', () => {
    expect(grantableStaffRoles('admin')).toEqual([]);
  });

  it('gives a moderator nothing, having no access in the first place', () => {
    expect(grantableStaffRoles('moderator')).toEqual([]);
  });

  it('never lets anyone mint their own role', () => {
    expect(grantableStaffRoles('owner')).not.toContain('owner');
  });
});

describe('canManageStaffRole', () => {
  it('lets a deputy owner act on an admin', () => {
    expect(
      canManageStaffRole({ actorRole: 'deputy_owner', targetRole: 'admin' }),
    ).toBe(true);
  });

  it('refuses to let a deputy owner act on another deputy owner', () => {
    expect(
      canManageStaffRole({
        actorRole: 'deputy_owner',
        targetRole: 'deputy_owner',
      }),
    ).toBe(false);
  });

  it('refuses to let an admin act on a deputy owner', () => {
    expect(
      canManageStaffRole({ actorRole: 'admin', targetRole: 'deputy_owner' }),
    ).toBe(false);
  });

  /**
   * An owner promoting one of their own accounts is the one move the ladder
   * cannot check, so it is refused outright.
   */
  it('refuses to let anyone act on their own account', () => {
    expect(
      canManageStaffRole({
        actorRole: 'owner',
        targetRole: 'owner',
        isSelf: true,
      }),
    ).toBe(false);
  });

  it('refuses a member with no role', () => {
    expect(canManageStaffRole({ actorRole: null, targetRole: null })).toBe(
      false,
    );
  });
});

describe('canAssignStaffRole', () => {
  it('lets an owner promote a member to deputy owner', () => {
    expect(
      canAssignStaffRole({
        actorRole: 'owner',
        targetRole: null,
        nextRole: 'deputy_owner',
      }),
    ).toBe(true);
  });

  it('lets an owner promote a moderator to admin', () => {
    expect(
      canAssignStaffRole({
        actorRole: 'owner',
        targetRole: 'moderator',
        nextRole: 'admin',
      }),
    ).toBe(true);
  });

  it('refuses to let a deputy owner promote anyone to deputy owner', () => {
    expect(
      canAssignStaffRole({
        actorRole: 'deputy_owner',
        targetRole: null,
        nextRole: 'deputy_owner',
      }),
    ).toBe(false);
  });

  it('refuses to let an admin promote anybody', () => {
    expect(
      canAssignStaffRole({
        actorRole: 'admin',
        targetRole: null,
        nextRole: 'admin',
      }),
    ).toBe(false);
  });

  it('never grants owner, whoever is asking', () => {
    expect(
      canAssignStaffRole({
        actorRole: 'owner',
        targetRole: null,
        nextRole: 'owner',
      }),
    ).toBe(false);
  });

  it('lets a deputy owner revoke an admin', () => {
    expect(
      canAssignStaffRole({
        actorRole: 'deputy_owner',
        targetRole: 'admin',
        nextRole: null,
      }),
    ).toBe(true);
  });

  it('refuses to revoke a role the actor does not outrank', () => {
    expect(
      canAssignStaffRole({
        actorRole: 'admin',
        targetRole: 'owner',
        nextRole: null,
      }),
    ).toBe(false);
  });

  it('refuses to revoke from a member who has no role', () => {
    expect(
      canAssignStaffRole({
        actorRole: 'owner',
        targetRole: null,
        nextRole: null,
      }),
    ).toBe(false);
  });

  it('refuses a write that changes nothing', () => {
    expect(
      canAssignStaffRole({
        actorRole: 'owner',
        targetRole: 'admin',
        nextRole: 'admin',
      }),
    ).toBe(false);
  });
});
