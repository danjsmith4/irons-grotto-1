'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAction } from 'next-safe-action/hooks';
import { toast } from 'react-toastify';
import { Dialog, DropdownMenu, Spinner } from '@radix-ui/themes';
import {
  ChevronDownIcon,
  MagnifyingGlassIcon,
  PersonIcon,
} from '@radix-ui/react-icons';
import { StaffBadge } from '@/app/components/staff-badge';
import { AccountTypeBadge } from '@/app/components/account-type-badge';
import { PlayerNameButton } from '@/app/components/player-name-button';
import { getRankName } from '@/app/player/utils/get-rank-name';
import { formatNumber } from '@/app/utils/format-number';
import { formatTimeAgo } from '@/app/utils/format-time-ago';
import { staffRoleRanks, type StaffRole } from '@/app/schemas/staff';
import {
  canManageStaffRole,
  grantableStaffRoles,
  staffRoleOrder,
} from '@/app/utils/staff-permissions';
import type {
  StaffDirectoryEntry,
  StaffRoleChangeEntry,
} from '@/lib/db/staff-operations';
import { setStaffRoleAction } from './actions/set-staff-role-action';
import { syncStaffDiscordRoleAction } from './actions/sync-staff-discord-role-action';
import styles from './admin.module.css';

interface StaffRolesProps {
  viewerRole: StaffRole;
  members: StaffDirectoryEntry[];
  history: StaffRoleChangeEntry[];
}

/** A change the actor has asked for but not yet confirmed. */
interface PendingChange {
  member: StaffDirectoryEntry;
  nextRole: StaffRole | null;
}

const roleLabel = (role: StaffRole | null) =>
  role ? getRankName(staffRoleRanks[role]) : 'No role';

/**
 * Staff role administration — the admin page's default pane.
 *
 * Every control here is also enforced server-side — this decides what is worth
 * offering, not what is allowed. See `app/utils/staff-permissions.ts` for the
 * one rule behind all of it: you may only assign a role below your own.
 *
 * The page heading belongs to `AdminPanes`, not here: it names the page rather
 * than this pane, and stays put while the pane under it swaps.
 */
export function StaffRoles({
  viewerRole,
  members,
  history,
}: StaffRolesProps) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [pending, setPending] = useState<PendingChange | null>(null);

  const { execute, isExecuting } = useAction(setStaffRoleAction, {
    onSuccess({ data }) {
      if (!data) {
        return;
      }

      const summary = data.newRole
        ? `${data.playerName} is now ${roleLabel(data.newRole)}`
        : `${data.playerName} is no longer ${roleLabel(data.oldRole)}`;

      // The role itself is saved either way — Discord is a mirror of it, and
      // saying so is more useful than a bare success.
      if (data.discord === 'failed') {
        toast.warning(
          `${summary}, but their Discord roles could not be updated. Re-sync from the Manage menu.`,
        );
      } else if (data.discord === 'not-in-server') {
        toast.warning(`${summary}. They are not in the Discord server.`);
      } else {
        toast.success(`${summary}, in game and in Discord.`);
      }

      setPending(null);
      router.refresh();
    },
    onError({ error }) {
      toast.error(error.serverError ?? 'Could not change that role.');
    },
  });

  const { execute: syncDiscord, isExecuting: isSyncing } = useAction(
    syncStaffDiscordRoleAction,
    {
      onSuccess({ data }) {
        if (!data) {
          return;
        }

        if (data.discord === 'not-in-server') {
          toast.warning(`${data.playerName} is not in the Discord server.`);

          return;
        }

        toast.success(`${data.playerName}’s Discord roles are up to date.`);
      },
      onError({ error }) {
        toast.error(error.serverError ?? 'Could not sync Discord.');
      },
    },
  );

  const grantable = useMemo(
    () => grantableStaffRoles(viewerRole),
    [viewerRole],
  );

  const staff = useMemo(
    () =>
      members
        .filter((member) => member.staffRole)
        .sort(
          (a, b) =>
            staffRoleOrder[b.staffRole!] - staffRoleOrder[a.staffRole!] ||
            b.points - a.points,
        ),
    [members],
  );

  const searchResults = useMemo(() => {
    const trimmed = query.trim().toLowerCase();

    if (!trimmed) {
      return [];
    }

    return members
      .filter((member) => member.playerName.toLowerCase().includes(trimmed))
      .slice(0, 25);
  }, [members, query]);

  function renderActions(member: StaffDirectoryEntry) {
    const canManage = canManageStaffRole({
      actorRole: viewerRole,
      targetRole: member.staffRole,
      isSelf: member.isSelf,
    });

    // Roles worth offering: those below the actor that the member does not
    // already hold.
    const options = canManage
      ? grantable.filter((role) => role !== member.staffRole)
      : [];
    const canRevoke = canManage && member.staffRole !== null;

    if (!canManage) {
      return (
        <span className={styles.noAction}>
          {member.isSelf ? 'You' : 'Outranks you'}
        </span>
      );
    }

    return (
      <DropdownMenu.Root>
        <DropdownMenu.Trigger>
          <button
            type="button"
            className={styles.manageButton}
            aria-label={`Manage ${member.playerName}`}
            disabled={isSyncing}
          >
            Manage
            <ChevronDownIcon />
          </button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Content color="gray" variant="soft">
          {options.length > 0 && (
            <DropdownMenu.Label>Promote to</DropdownMenu.Label>
          )}
          {options.map((role) => (
            <DropdownMenu.Item
              key={role}
              onSelect={() => setPending({ member, nextRole: role })}
            >
              {roleLabel(role)}
            </DropdownMenu.Item>
          ))}
          {(options.length > 0 || canRevoke) && <DropdownMenu.Separator />}
          {/*
            Assigning a role already held is refused, so a Discord call that
            failed at the time needs its own way back.
          */}
          <DropdownMenu.Item
            onSelect={() => syncDiscord({ playerName: member.playerName })}
          >
            Re-sync Discord roles
          </DropdownMenu.Item>
          {canRevoke && (
            <DropdownMenu.Item
              color="red"
              onSelect={() => setPending({ member, nextRole: null })}
            >
              Remove {roleLabel(member.staffRole)}
            </DropdownMenu.Item>
          )}
        </DropdownMenu.Content>
      </DropdownMenu.Root>
    );
  }

  function renderRow(member: StaffDirectoryEntry) {
    return (
      <tr key={member.playerName}>
        <td>
          <div className={styles.nameCell}>
            <span className={styles.badgeSlot}>
              <AccountTypeBadge accountType={member.accountType} />
            </span>
            <PlayerNameButton
              name={member.playerName}
              className={styles.name}
            />
            <StaffBadge role={member.staffRole} iconOnly />
          </div>
        </td>
        <td className={styles.roleCell}>{roleLabel(member.staffRole)}</td>
        <td className={styles.rankCell}>{member.rank ?? 'Unranked'}</td>
        <td className={`${styles.numberCell} ig-tabular`}>
          {formatNumber(Math.round(member.points))}
        </td>
        <td className={styles.actionCell}>{renderActions(member)}</td>
      </tr>
    );
  }

  return (
    <>
      <section className={styles.panel} aria-labelledby="staff-heading">
        <div className={styles.panelHead}>
          <h3 className={styles.panelTitle} id="staff-heading">
            Staff
          </h3>
          <span className={styles.panelMeta}>
            {staff.length} {staff.length === 1 ? 'member' : 'members'}
          </span>
        </div>
        {staff.length === 0 ? (
          <p className={styles.empty}>Nobody holds a staff role yet.</p>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th className={styles.thLeft}>Member</th>
                  <th className={styles.thLeft}>Role</th>
                  <th className={styles.thLeft}>Rank</th>
                  <th>Points</th>
                  <th aria-label="Actions" />
                </tr>
              </thead>
              <tbody>{staff.map(renderRow)}</tbody>
            </table>
          </div>
        )}
      </section>

      <section className={styles.panel} aria-labelledby="promote-heading">
        <div className={styles.panelHead}>
          <h3 className={styles.panelTitle} id="promote-heading">
            Promote a member
          </h3>
          <label className={styles.search}>
            <MagnifyingGlassIcon />
            <input
              type="search"
              value={query}
              placeholder="Search members"
              aria-label="Search members"
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
        </div>
        {!query.trim() ? (
          <p className={styles.empty}>
            Search for a member by name to change their role.
          </p>
        ) : searchResults.length === 0 ? (
          <p className={styles.empty}>No active member matches “{query}”.</p>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th className={styles.thLeft}>Member</th>
                  <th className={styles.thLeft}>Role</th>
                  <th className={styles.thLeft}>Rank</th>
                  <th>Points</th>
                  <th aria-label="Actions" />
                </tr>
              </thead>
              <tbody>{searchResults.map(renderRow)}</tbody>
            </table>
          </div>
        )}
      </section>

      <section className={styles.panel} aria-labelledby="history-heading">
        <div className={styles.panelHead}>
          <h3 className={styles.panelTitle} id="history-heading">
            Recent changes
          </h3>
          <span className={styles.panelMeta}>Newest first</span>
        </div>
        {history.length === 0 ? (
          <p className={styles.empty}>No role has been changed yet.</p>
        ) : (
          <ul className={styles.history}>
            {history.map((entry) => (
              <li key={entry.id} className={styles.historyRow}>
                <span className={styles.historyIcon}>
                  <PersonIcon />
                </span>
                <div className={styles.historyText}>
                  <span className={styles.historyLine}>
                    <PlayerNameButton
                      name={entry.playerName}
                      className={styles.name}
                    />{' '}
                    {entry.newRole ? (
                      <>became {roleLabel(entry.newRole)}</>
                    ) : (
                      <>lost {roleLabel(entry.oldRole)}</>
                    )}
                  </span>
                  <span className={styles.historyMeta}>
                    by {entry.changedByPlayerName ?? 'staff'}
                  </span>
                </div>
                <span className={`${styles.historyTime} ig-tabular`}>
                  {formatTimeAgo(new Date(entry.createdAt))}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <Dialog.Root
        open={pending !== null}
        onOpenChange={(open) => {
          if (!open && !isExecuting) {
            setPending(null);
          }
        }}
      >
        <Dialog.Content className={styles.dialog} maxWidth="440px">
          <Dialog.Title className={styles.dialogTitle}>
            {pending?.nextRole ? 'Confirm promotion' : 'Confirm removal'}
          </Dialog.Title>
          <Dialog.Description className={styles.dialogBody}>
            {pending?.nextRole ? (
              <>
                <strong>{pending.member.playerName}</strong> will become{' '}
                <strong>{roleLabel(pending.nextRole)}</strong>, here and in
                Discord. The matching Discord role is granted straight away,
                along with the server permissions it carries.
              </>
            ) : (
              <>
                <strong>{pending?.member.playerName}</strong> will lose{' '}
                <strong>{roleLabel(pending?.member.staffRole ?? null)}</strong>,
                here and in Discord. Their Discord role and its server
                permissions are removed straight away.
              </>
            )}
          </Dialog.Description>
          <div className={styles.dialogActions}>
            <button
              type="button"
              className={styles.ghostButton}
              disabled={isExecuting}
              onClick={() => setPending(null)}
            >
              Cancel
            </button>
            <button
              type="button"
              className={styles.primaryButton}
              disabled={isExecuting}
              onClick={() => {
                if (!pending) {
                  return;
                }

                execute({
                  playerName: pending.member.playerName,
                  role: pending.nextRole,
                });
              }}
            >
              {isExecuting && <Spinner size="1" />}
              {pending?.nextRole ? 'Promote' : 'Remove role'}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Root>
    </>
  );
}
