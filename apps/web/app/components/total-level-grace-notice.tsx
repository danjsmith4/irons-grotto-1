'use client';

import { format } from 'date-fns';
import { minimumJoinTotalLevel } from '@/config/clan-requirements';
import { resolveTotalLevelGrace } from '@/app/utils/resolve-total-level-grace';
import styles from './total-level-grace-notice.module.css';

interface TotalLevelGraceNoticeProps {
  totalLevel: number;
  /**
   * Which account this is about. Omitted on a page that is already about one
   * account (the rank sheet), given on the dashboard, where a member with
   * several needs to know which of them the notice means.
   */
  playerName?: string;
  /**
   * Injectable so the spec can pin a date. Defaults to now — a component that
   * had to be told what day it is at every call site would eventually be told
   * wrong at one of them.
   */
  now?: Date;
}

/**
 * What a member already in the clan is told about the new minimum total level.
 *
 * The 1500 floor applies at the door, so it cannot be applied to the existing
 * roster without throwing people out of a clan they joined under different
 * rules. Everyone below it keeps everything and has until the deadline to get
 * there — and this is how they find out, rather than from a rule they never
 * saw.
 *
 * Renders **nothing** for the overwhelming majority of members, who are above
 * the line. It is safe to mount unconditionally, which is the point: the call
 * sites do not each have to reimplement the test.
 *
 * ⚠️ **Past the deadline it still only tells them.** `overdue` changes the
 * wording and the colour and does nothing else — no lockout, no hidden page, no
 * countdown to an automatic removal, because nothing in this app removes
 * anybody. Whether a member stays is a conversation for the staff who know
 * them.
 */
export function TotalLevelGraceNotice({
  totalLevel,
  playerName,
  now,
}: TotalLevelGraceNoticeProps) {
  const grace = resolveTotalLevelGrace(totalLevel, now ?? new Date());

  if (grace.status === 'met') {
    return null;
  }

  const isOverdue = grace.status === 'overdue';
  const deadline = format(grace.deadline, 'd MMMM yyyy');
  const progress = Math.min(100, (totalLevel / minimumJoinTotalLevel) * 100);

  return (
    <div
      className={`${styles.root} ${isOverdue ? styles.overdue : ''}`}
      role="note"
      aria-label="Minimum total level"
    >
      <div className={styles.body}>
        <p className={styles.title}>
          The Grotto now asks for{' '}
          {minimumJoinTotalLevel.toLocaleString()} total level
        </p>
        <p className={styles.note}>
          {playerName ? `${playerName} is at ` : "You're at "}
          <span className={styles.figure}>{totalLevel.toLocaleString()}</span> —{' '}
          <span className={styles.figure}>
            {grace.shortfall.toLocaleString()}
          </span>{' '}
          to go.{' '}
          {isOverdue ? (
            <>
              The deadline for members who were already here was{' '}
              <span className={styles.figure}>{deadline}</span>. Nothing has
              changed automatically — have a word with a moderator and they
              &apos;ll sort it out with you.
            </>
          ) : (
            <>
              This applies to new members from today; you have until{' '}
              <span className={styles.figure}>{deadline}</span> to get there —{' '}
              <span className={styles.figure}>{grace.daysRemaining}</span>{' '}
              {grace.daysRemaining === 1 ? 'day' : 'days'}. Nothing changes for
              you before then.
            </>
          )}
        </p>
        <div className={styles.meter}>
          <div className={styles.meterFill} style={{ width: `${progress}%` }} />
        </div>
      </div>
    </div>
  );
}
