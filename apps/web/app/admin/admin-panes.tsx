'use client';

import { useMemo, useRef, useState } from 'react';
import { LockClosedIcon } from '@radix-ui/react-icons';
import { SectionHeader } from '@/app/components/section-header';
import { StaffBadge } from '@/app/components/staff-badge';
import { getRankName } from '@/app/player/utils/get-rank-name';
import { staffRoleRanks, type StaffRole } from '@/app/schemas/staff';
import { grantableStaffRoles } from '@/app/utils/staff-permissions';
import type {
  StaffDirectoryEntry,
  StaffRoleChangeEntry,
} from '@/lib/db/staff-operations';
import type { DiscordBanEntry } from '@/app/data-sources/fetch-discord-bans';
import { StaffRoles } from './staff-roles';
import { DiscordBans } from './discord-bans';
import styles from './admin.module.css';

type AdminPane = 'staff' | 'bans';

const panes = [
  { id: 'staff', label: 'Staff ranks' },
  { id: 'bans', label: 'Discord bans' },
] as const satisfies readonly { id: AdminPane; label: string }[];

interface AdminPanesProps {
  viewerRole: StaffRole;
  viewerPlayerName: string | null;
  members: StaffDirectoryEntry[];
  history: StaffRoleChangeEntry[];
  bans: DiscordBanEntry[] | null;
  bansError: string | null;
}

/**
 * The admin page's sub-menu.
 *
 * Two unrelated jobs live here — who is staff, and who is banned from the
 * Discord — and stacking every panel from both on one column made a page you
 * had to scroll past one job to reach the other. This swaps which set is
 * mounted instead.
 *
 * Deliberately not routes. Both sets of data are already fetched and handed
 * down by the server component, so a route per pane would buy a URL at the
 * cost of a round trip on every switch. If a pane ever needs to be linked to
 * or bookmarked, that is the point to promote it to `/admin/bans` — until
 * then, this is the whole mechanism.
 */
export function AdminPanes({
  viewerRole,
  viewerPlayerName,
  members,
  history,
  bans,
  bansError,
}: AdminPanesProps) {
  const [active, setActive] = useState<AdminPane>('staff');
  const tabRefs = useRef<Record<AdminPane, HTMLButtonElement | null>>({
    staff: null,
    bans: null,
  });

  const grantable = useMemo(
    () => grantableStaffRoles(viewerRole),
    [viewerRole],
  );

  const subtitle =
    active === 'staff'
      ? `Signed in as ${viewerPlayerName ?? 'staff'}. You can assign any role below your own — ${
          grantable.length
            ? grantable
                .map((role) => getRankName(staffRoleRanks[role]))
                .join(' and ')
            : 'which, as an administrator, is none'
        }.`
      : 'Bans are placed and lifted in the clan Discord. You can act on anyone whose role is below your own.';

  /**
   * A tablist is expected to move between its tabs with the arrow keys, so Tab
   * lands on the strip once rather than on every tab in it.
   */
  function handleTabKeyDown(event: React.KeyboardEvent) {
    const offset =
      event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0;

    if (offset === 0) {
      return;
    }

    event.preventDefault();

    const index = panes.findIndex((pane) => pane.id === active);
    const next = panes[(index + offset + panes.length) % panes.length];

    setActive(next.id);
    tabRefs.current[next.id]?.focus();
  }

  return (
    <>
      <SectionHeader
        title="Clan administration"
        subtitle={subtitle}
        icon={<LockClosedIcon />}
        actions={<StaffBadge role={viewerRole} />}
      />

      <div
        className={styles.paneTabs}
        role="tablist"
        aria-label="Administration sections"
        onKeyDown={handleTabKeyDown}
      >
        {panes.map((pane) => (
          <button
            key={pane.id}
            ref={(element) => {
              tabRefs.current[pane.id] = element;
            }}
            type="button"
            role="tab"
            id={`admin-tab-${pane.id}`}
            aria-selected={active === pane.id}
            aria-controls={`admin-pane-${pane.id}`}
            tabIndex={active === pane.id ? 0 : -1}
            className={styles.paneTab}
            onClick={() => setActive(pane.id)}
          >
            {pane.label}
          </button>
        ))}
      </div>

      <div
        className={styles.pane}
        role="tabpanel"
        id={`admin-pane-${active}`}
        aria-labelledby={`admin-tab-${active}`}
      >
        {active === 'staff' ? (
          <StaffRoles
            viewerRole={viewerRole}
            members={members}
            history={history}
          />
        ) : (
          <DiscordBans bans={bans} error={bansError} />
        )}
      </div>
    </>
  );
}
