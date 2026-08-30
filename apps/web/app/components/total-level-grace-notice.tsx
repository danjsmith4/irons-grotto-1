'use client';

import { format } from 'date-fns';
import { minimumJoinTotalLevel } from '@/config/clan-requirements';
import {
  resolveTotalLevelGrace,
  type GraceAccount,
} from '@/app/utils/resolve-total-level-grace';
import styles from './total-level-grace-notice.module.css';

interface TotalLevelGraceNoticeProps {
  accounts: GraceAccount[];
  /**
   * Injectable so the spec can pin a date. Defaults to now, because a
   * component that had to be told what day it is at every call site would
   * eventually be told wrong at one of them.
   */
  now?: Date;
}

/**
 * What a member already in the clan is told about the new minimum total level.
 *
 * The 1500 floor applies at the door, so it cannot be applied to the existing
 * roster without throwing people out of a clan they joined under different
 * rules. Everyone below it keeps everything and has until the deadline to get
 * there, and this is how they find out rather than from a rule they never saw.
 *
 * ⚠️ **It takes a list, not one account.** A member with three accounts should
 * see one notice listing whichever of them are short, not the same paragraph of
 * explanation three times. The deadline is a single clan-wide date, so it is
 * said once and the accounts are listed under it. Stacking a copy of this
 * component per account is the thing this shape exists to prevent.
 *
 * Renders **nothing** when every account given is above the line, which is the
 * overwhelming majority. It is safe to mount unconditionally, which is the
 * point: no call site has to reimplement the test.
 *
 * ⚠️ **Past the deadline it still only tells them.** `overdue` changes the
 * wording and the colour and does nothing else. No lockout, no hidden page, no
 * countdown to an automatic removal, because nothing in this app removes
 * anybody. Whether a member stays is a conversation for the staff who know them.
 */
export function TotalLevelGraceNotice({
  accounts,
  now,
}: TotalLevelGraceNoticeProps) {
  const when = now ?? new Date();

  const short = accounts
    .map((account) => ({
      ...account,
      grace: resolveTotalLevelGrace(account.totalLevel, when),
    }))
    .filter(({ grace }) => grace.status !== 'met');

  const [first] = short;

  if (!first || first.grace.status === 'met') {
    return null;
  }

  // The deadline is one clan-wide date, so every short account shares it and it
  // is said once rather than per row. Taken off the first account's result
  // because they all carry the same one.
  const shared = first.grace;
  const deadline = format(shared.deadline, 'd MMMM yyyy');

  return (
    <div
      className={`${styles.root} ${shared.status === 'overdue' ? styles.overdue : ''}`}
      role="note"
      aria-label="Minimum total level"
    >
      <p className={styles.title}>
        Irons Grotto now requires {minimumJoinTotalLevel.toLocaleString()} total
        level
      </p>

      <p className={styles.note}>
        {shared.status === 'overdue' ? (
          <>
            The deadline for members who were already in the clan was{' '}
            <span className={styles.figure}>{deadline}</span>. Nothing has
            happened automatically. Have a word with a moderator and
            they&apos;ll sort it out with you.
          </>
        ) : (
          <>
            You were already in the clan when this came in, so you have until{' '}
            <span className={styles.figure}>{deadline}</span> to get there. You
            have <span className={styles.figure}>{shared.daysRemaining}</span>{' '}
            {shared.daysRemaining === 1 ? 'day' : 'days'} to meet the total
            level requirement.
          </>
        )}
      </p>

      <ul className={styles.accounts}>
        {short.map(({ playerName, totalLevel }) => (
          <li key={playerName ?? 'self'} className={styles.account}>
            <div className={styles.accountLine}>
              {playerName && (
                <span className={styles.accountName}>{playerName}</span>
              )}
              {/*
                Read as a ratio rather than a level and a gap. "1,342 / 1,500"
                says where they are and what they need in one glance, and the
                meter underneath is the same fact drawn.
              */}
              <span className={styles.accountProgress}>
                {totalLevel.toLocaleString()}
                <span className={styles.accountTarget}>
                  {' / '}
                  {minimumJoinTotalLevel.toLocaleString()}
                </span>
              </span>
            </div>
            <div className={styles.meter}>
              <div
                className={styles.meterFill}
                style={{
                  width: `${Math.min(100, (totalLevel / minimumJoinTotalLevel) * 100)}%`,
                }}
              />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
