'use client';

import { Rank } from '@/config/enums';
import { useRankPace } from '../hooks/use-rank-pace';
import { getRankName } from '../utils/get-rank-name';
import { formatDurationCompact } from '../utils/format-duration-compact';
import styles from './rank-calculator.module.css';

/**
 * "At Captain — 5mo". Gives a submission some sense of how long the player has
 * been sitting where they are.
 */
export function RankPace({ rank }: { rank: Rank }) {
  const pace = useRankPace(rank);

  if (!pace) {
    return null;
  }

  const { daysAtRank, since, isFromRankUp } = pace;

  return (
    <div className={styles.metaItem}>
      <span className={styles.metaLabel}>At {getRankName(rank)}</span>
      <span
        className={`${styles.metaValue} ${styles.metaNumeric}`}
        title={
          isFromRankUp
            ? `Promoted ${since.toLocaleDateString()}`
            : `No promotion on record — measured from joining, ${since.toLocaleDateString()}`
        }
      >
        {formatDurationCompact(daysAtRank)}
        {isFromRankUp ? '' : '+'}
      </span>
    </div>
  );
}
