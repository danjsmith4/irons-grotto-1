import { and, desc, eq, inArray, isNotNull, sql } from 'drizzle-orm';
import { db } from './index';
import { players, staffRoleChanges } from './schema';
import type { StaffRole } from '@/app/schemas/staff';
import {
  canAssignStaffRole,
  canManageStaffRole,
  elevatedStaffRoles,
  staffRoleOrder,
} from '@/app/utils/staff-permissions';

export interface StaffIdentity {
  role: StaffRole | null;
  /** The account the role is held on, which is what the audit trail names. */
  playerName: string | null;
}

/**
 * The staff standing of whoever is signed in.
 *
 * A Discord account can own several player rows, so the highest role across
 * them wins — an owner who also tracks an alt is still an owner, and the
 * account carrying that role is the one recorded as the actor. Only active
 * players count: a soft-deleted row belongs to someone the inactivity
 * reconcile has already decided is no longer in the clan.
 */
export async function getStaffIdentityForDiscordUser(
  discordUserId: string,
): Promise<StaffIdentity> {
  const rows = await db
    .select({
      staffRole: players.staffRole,
      playerName: players.playerName,
    })
    .from(players)
    .where(
      and(
        eq(players.discordUserId, discordUserId),
        eq(players.isActive, true),
        isNotNull(players.staffRole),
      ),
    );

  return rows.reduce<StaffIdentity>(
    (highest, { staffRole, playerName }) => {
      if (!staffRole) {
        return highest;
      }

      if (
        !highest.role ||
        staffRoleOrder[staffRole] > staffRoleOrder[highest.role]
      ) {
        return { role: staffRole, playerName };
      }

      return highest;
    },
    { role: null, playerName: null },
  );
}

export interface ClanIdentity {
  /** Every account this Discord user tracks here, active or not. */
  playerNames: string[];
  /** The highest role held on an **active** account, null if none. */
  staffRole: StaffRole | null;
}

/**
 * Who these Discord accounts are in the clan, in one query.
 *
 * Used by the ban panes, where most ids belong to nobody and the rest may
 * belong to someone who left. Names are collected from every row, including
 * soft-deleted ones — knowing a banned account used to be a member is exactly
 * the context a moderator wants — but the staff role is read only from active
 * rows, because that is what standing means everywhere else in this file.
 */
export async function getClanIdentitiesForDiscordUsers(
  discordUserIds: string[],
): Promise<Map<string, ClanIdentity>> {
  const identities = new Map<string, ClanIdentity>();

  if (discordUserIds.length === 0) {
    return identities;
  }

  const rows = await db
    .select({
      discordUserId: players.discordUserId,
      playerName: players.playerName,
      staffRole: players.staffRole,
      isActive: players.isActive,
    })
    .from(players)
    .where(inArray(players.discordUserId, [...new Set(discordUserIds)]));

  rows.forEach(({ discordUserId, playerName, staffRole, isActive }) => {
    const existing = identities.get(discordUserId) ?? {
      playerNames: [],
      staffRole: null,
    };

    existing.playerNames.push(playerName);

    if (
      isActive &&
      staffRole &&
      (!existing.staffRole ||
        staffRoleOrder[staffRole] > staffRoleOrder[existing.staffRole])
    ) {
      existing.staffRole = staffRole;
    }

    identities.set(discordUserId, existing);
  });

  return identities;
}

export interface StaffDirectoryEntry {
  playerName: string;
  rank: string | null;
  staffRole: StaffRole | null;
  accountType: (typeof players.$inferSelect)['accountType'];
  points: number;
  /** True when this row belongs to the signed-in Discord account. */
  isSelf: boolean;
}

/**
 * Every active member, with the standing the dashboard sorts and filters on.
 *
 * The whole roster is returned in one go rather than paged: it is a clan, not
 * a directory of thousands, and promoting someone means finding them by name
 * without a round trip per keystroke.
 */
export async function getStaffDirectory(
  viewerDiscordUserId: string,
): Promise<StaffDirectoryEntry[]> {
  const rows = await db
    .select({
      playerName: players.playerName,
      rank: players.rank,
      staffRole: players.staffRole,
      accountType: players.accountType,
      points: players.points,
      discordUserId: players.discordUserId,
    })
    .from(players)
    .where(eq(players.isActive, true))
    .orderBy(desc(players.points));

  return rows.map(({ discordUserId, ...player }) => ({
    ...player,
    isSelf: discordUserId === viewerDiscordUserId,
  }));
}

interface SetPlayerStaffRoleInput {
  playerName: string;
  nextRole: StaffRole | null;
  actorRole: StaffRole | null;
  actorDiscordUserId: string;
  actorPlayerName: string | null;
}

export type SetPlayerStaffRoleResult =
  | {
      status: 'updated';
      playerName: string;
      oldRole: StaffRole | null;
      /** Who to mirror the change onto in Discord. */
      discordUserId: string;
    }
  | { status: 'player-not-found' }
  | { status: 'forbidden' };

/**
 * Writes a member's staff role and records who changed it.
 *
 * The ladder is re-checked here, inside the transaction, against the role the
 * target holds *now* — the dashboard has already checked it against the copy
 * it rendered, which may be minutes old. Two deputies acting at once must not
 * be able to walk each other up the ladder.
 */
export async function setPlayerStaffRole({
  playerName,
  nextRole,
  actorRole,
  actorDiscordUserId,
  actorPlayerName,
}: SetPlayerStaffRoleInput): Promise<SetPlayerStaffRoleResult> {
  return db.transaction(async (tx) => {
    const [target] = await tx
      .select({
        playerName: players.playerName,
        staffRole: players.staffRole,
        discordUserId: players.discordUserId,
      })
      .from(players)
      .where(
        and(
          sql`lower(${players.playerName}) = lower(${playerName})`,
          eq(players.isActive, true),
        ),
      )
      .limit(1);

    if (!target) {
      return { status: 'player-not-found' as const };
    }

    const allowed = canAssignStaffRole({
      actorRole,
      targetRole: target.staffRole,
      nextRole,
      isSelf: target.discordUserId === actorDiscordUserId,
    });

    if (!allowed) {
      return { status: 'forbidden' as const };
    }

    await tx
      .update(players)
      .set({ staffRole: nextRole, updatedAt: new Date() })
      .where(eq(players.playerName, target.playerName));

    await tx.insert(staffRoleChanges).values({
      playerName: target.playerName,
      oldRole: target.staffRole,
      newRole: nextRole,
      changedByPlayerName: actorPlayerName,
      changedByDiscordUserId: actorDiscordUserId,
    });

    return {
      status: 'updated' as const,
      playerName: target.playerName,
      oldRole: target.staffRole,
      discordUserId: target.discordUserId,
    };
  });
}

export type ManageableMember =
  | {
      status: 'found';
      playerName: string;
      staffRole: StaffRole | null;
      discordUserId: string;
    }
  | { status: 'player-not-found' }
  | { status: 'forbidden' };

/**
 * Looks a member up for an action that reads their role rather than writing it
 * — the Discord re-sync — applying the same outranking rule as a write.
 */
export async function getManageableMember(
  playerName: string,
  actorRole: StaffRole | null,
  actorDiscordUserId: string,
): Promise<ManageableMember> {
  const [target] = await db
    .select({
      playerName: players.playerName,
      staffRole: players.staffRole,
      discordUserId: players.discordUserId,
    })
    .from(players)
    .where(
      and(
        sql`lower(${players.playerName}) = lower(${playerName})`,
        eq(players.isActive, true),
      ),
    )
    .limit(1);

  if (!target) {
    return { status: 'player-not-found' };
  }

  const allowed = canManageStaffRole({
    actorRole,
    targetRole: target.staffRole,
    isSelf: target.discordUserId === actorDiscordUserId,
  });

  return allowed ? { status: 'found', ...target } : { status: 'forbidden' };
}

export interface StaffRoleChangeEntry {
  id: string;
  playerName: string;
  oldRole: StaffRole | null;
  newRole: StaffRole | null;
  changedByPlayerName: string | null;
  createdAt: Date;
}

/** The recent history, newest first, for the dashboard's audit panel. */
export async function getStaffRoleChanges(
  limit = 25,
): Promise<StaffRoleChangeEntry[]> {
  return db
    .select({
      id: staffRoleChanges.id,
      playerName: staffRoleChanges.playerName,
      oldRole: staffRoleChanges.oldRole,
      newRole: staffRoleChanges.newRole,
      changedByPlayerName: staffRoleChanges.changedByPlayerName,
      createdAt: staffRoleChanges.createdAt,
    })
    .from(staffRoleChanges)
    .orderBy(desc(staffRoleChanges.createdAt))
    .limit(limit);
}

/**
 * Everyone eligible for event-setup duty: the elevated staff, who are exactly
 * the accounts that can reach `/admin` and therefore the only ones who can act
 * on being rolled.
 *
 * Ordered by name so the pool is stable — the randomness should come from the
 * roll, not from whatever order Postgres feels like returning rows in.
 */
export async function getElevatedStaffCandidates(): Promise<
  { playerName: string; discordUserId: string; staffRole: StaffRole }[]
> {
  const rows = await db
    .select({
      playerName: players.playerName,
      discordUserId: players.discordUserId,
      staffRole: players.staffRole,
    })
    .from(players)
    .where(
      and(
        eq(players.isActive, true),
        inArray(players.staffRole, [...elevatedStaffRoles]),
      ),
    )
    .orderBy(players.playerName);

  return rows.flatMap(({ playerName, discordUserId, staffRole }) =>
    staffRole ? [{ playerName, discordUserId, staffRole }] : [],
  );
}
