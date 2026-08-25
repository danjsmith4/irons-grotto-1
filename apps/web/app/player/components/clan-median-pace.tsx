'use client';

import { Rank } from '@/config/enums';
import { useRankPace } from '../hooks/use-rank-pace';
import { formatDurationCompact } from '../utils/format-duration-compact';
import styles from './rank-calculator.module.css';

/**
 * "Clan median 2mo" — how the player's time at their rank compares to how long
 * the clan usually spends there, coloured by whether they're overdue.
 *
 * PARKED, deliberately not rendered anywhere. The maths and the query behind it
 * are intact (`calculateRankPace`, `fetchRankPace`) and still covered by specs;
 * only the display is switched off, because as of 2026-08 the rank-up history
 * can't support it: 172 promotions produce just 34 *completed* stints, only
 * Corporal (6) and Proselyte (5) reach `minimumPaceSampleSize`, and both spread
 * across 0–170 days. A median off that is noise wearing a number's clothes.
 *
 * To put it back, drop it beside `<RankPace />` in `calculator-hero.tsx`:
 *
 *     <RankPace rank={rank} />
 *     <ClanMedianPace rank={rank} />
 *
 * Revisit once most ranks clear the sample-size threshold.
 */
export function ClanMedianPace({ rank }: { rank: Rank }) {
  const pace = useRankPace(rank);

  if (!pace?.clanMedianDays) {
    return null;
  }

  const { clanMedianDays, clanSampleSize, isBehindPace } = pace;

  return (
    <div className={styles.metaItem}>
      <span className={styles.metaLabel}>Clan median</span>
      <span
        className={`${styles.metaValue} ${styles.metaNumeric} ${
          isBehindPace ? styles.paceBehind : styles.paceAhead
        }`}
        title={`${
          isBehindPace ? 'Longer than' : 'Inside'
        } the ${formatDurationCompact(
          clanMedianDays,
        )} the clan typically spends at this rank (median of ${clanSampleSize} promotions)`}
      >
        {formatDurationCompact(clanMedianDays)}
      </span>
    </div>
  );
}
