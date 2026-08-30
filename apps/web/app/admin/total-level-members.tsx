'use client';

import { format } from 'date-fns';
import { PlayerNameButton } from '@/app/components/player-name-button';
import { AccountTypeBadge } from '@/app/components/account-type-badge';
import { getRankName } from '@/app/player/utils/get-rank-name';
import { minimumJoinTotalLevel } from '@/config/clan-requirements';
import type { MemberBelowTotalLevelEntry } from '@/app/data-sources/fetch-admin-dashboard';
import type { Rank } from '@/config/enums';
import styles from './admin.module.css';

interface TotalLevelMembersProps {
  members: MemberBelowTotalLevelEntry[];
}

/**
 * Members who were here before the minimum total level, and where each stands.
 *
 * ⚠️ **Read-only, on purpose.** There is no remove button, no bulk action and
 * no "notify everyone" — this pane exists so that a moderator can see who the
 * new rule catches and have a conversation, and a one-click roster purge is not
 * a thing this app should own. Nothing anywhere acts on `overdue` by itself.
 *
 * Furthest from the line first, which is the order a moderator wants: the
 * member who is 900 levels short is a different conversation from the one who
 * is thirty away and will pass on their own before the deadline.
 *
 * Mains are included. Almost every clan-wide list here excludes them because
 * they are not on the points ladder, but the minimum applies at the door to
 * everybody — see `getMembersBelowTotalLevel`.
 */
export function TotalLevelMembers({ members }: TotalLevelMembersProps) {
  return (
    <div className={styles.panel}>
      <div className={styles.panelHead}>
        <h2 className={styles.panelTitle}>
          Below {minimumJoinTotalLevel.toLocaleString()} total
        </h2>
        <span className={styles.panelMeta}>
          {members.length} {members.length === 1 ? 'member' : 'members'}
        </span>
      </div>

      {members.length === 0 ? (
        <p className={styles.empty}>
          Every active member is at {minimumJoinTotalLevel.toLocaleString()}{' '}
          total level or above.
        </p>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.thLeft}>Member</th>
                <th className={styles.thLeft}>Rank</th>
                <th>Total</th>
                <th>To go</th>
                <th className={styles.thLeft}>Deadline</th>
              </tr>
            </thead>
            <tbody>
              {members.map(({ playerName, totalLevel, rank, accountType, grace }) => (
                <tr key={playerName}>
                  <td>
                    <div className={styles.nameCell}>
                      <span className={styles.badgeSlot}>
                        {accountType && (
                          <AccountTypeBadge
                            accountType={accountType}
                            size={16}
                          />
                        )}
                      </span>
                      <PlayerNameButton
                        name={playerName}
                        className={styles.name}
                      />
                    </div>
                  </td>
                  <td className={styles.rankCell}>
                    {getRankName(rank as Rank)}
                  </td>
                  <td className={styles.numberCell}>
                    {totalLevel.toLocaleString()}
                  </td>
                  <td className={styles.numberCell}>
                    {grace.status === 'met'
                      ? '—'
                      : grace.shortfall.toLocaleString()}
                  </td>
                  <td>
                    {grace.status === 'in-grace' && (
                      <>
                        {format(grace.deadline, 'd MMM yyyy')}{' '}
                        <span className={styles.departedTag}>
                          {grace.daysRemaining}d left
                        </span>
                      </>
                    )}
                    {grace.status === 'overdue' && (
                      <>
                        {format(grace.deadline, 'd MMM yyyy')}{' '}
                        <span className={styles.departed}>passed</span>
                      </>
                    )}
                    {/*
                      Only reachable if someone reaches the minimum between the
                      query and this render — the query already filters below
                      it. Rendered rather than crashed on.
                    */}
                    {grace.status === 'met' && '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
