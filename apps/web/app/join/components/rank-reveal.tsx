'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import { getRankImageUrl } from '@/app/player/utils/get-rank-image-url';
import { getRankName } from '@/app/player/utils/get-rank-name';
import type { RankReveal as RankRevealData } from '../actions/reveal-rank-action';
import styles from '../join.module.css';

interface RankRevealProps {
  playerName: string;
  reveal: RankRevealData;
  /** The rank application is in flight. */
  isApplying?: boolean;
  /** It did not go through. The way in stays open regardless. */
  applyError?: string | null;
  onContinue: () => void;
}

/**
 * The last thing onboarding does.
 *
 * ⚠️ **This is a rank the player can apply for, not one they have been given.**
 * The copy says so in as many words. Their stored rank is still `Unranked`
 * until a moderator approves a submission, because approval is what assigns the
 * real in-game and Discord clan ranks. Getting that wrong here would be a
 * permissions change dressed up as a celebration.
 *
 * The animation is CSS and staged by delay, so it plays once and then holds —
 * nothing loops except the halo, and `prefers-reduced-motion` drops all of it
 * to a static composition rather than a faster one.
 */
export function RankReveal({
  playerName,
  reveal,
  isApplying,
  applyError,
  onContinue,
}: RankRevealProps) {
  const {
    rank,
    nextRank,
    points,
    rankThreshold,
    nextRankThreshold,
    canApply,
    throttleReason,
  } = reveal;

  // Held at zero for a frame so the meter animates from empty on mount rather
  // than rendering already full.
  const [meterWidth, setMeterWidth] = useState(0);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      if (!nextRankThreshold) {
        setMeterWidth(100);

        return;
      }

      const span = nextRankThreshold - rankThreshold;
      const progress = span > 0 ? (points - rankThreshold) / span : 1;

      setMeterWidth(Math.max(2, Math.min(100, progress * 100)));
    });

    return () => window.cancelAnimationFrame(frame);
  }, [points, rankThreshold, nextRankThreshold]);

  return (
    <div className={styles.reveal}>
      <p className={`${styles.eyebrow} ${styles.revealLead}`}>
        {canApply ? 'You qualify for' : 'Your account'}
      </p>

      <div className={styles.revealBadge}>
        <span className={styles.revealHalo} />
        <span className={styles.revealRing} />
        <Image
          className={styles.revealCrest}
          src={getRankImageUrl(rank)}
          alt=""
          width={88}
          height={88}
          style={{ borderRadius: '50%' }}
        />
      </div>

      <h1 className={styles.revealRank}>{getRankName(rank)}</h1>

      <p className={styles.revealPoints}>
        {Math.round(points).toLocaleString()} points
      </p>

      <div className={styles.meter}>
        <div className={styles.meterFill} style={{ width: `${meterWidth}%` }} />
      </div>

      <p className={styles.revealNote}>
        {!canApply ? (
          <>
            {playerName} is a main account, so it is tracked here but is not on
            the ironman rank ladder. Everything else in the calculator works the
            same.
          </>
        ) : throttleReason ? (
          <>
            You are one step short: {getRankName(rank)} is as far as the
            points go until you have{' '}
            {throttleReason === 'items'
              ? 'the items the next rank asks for'
              : 'Master combat achievements'}
            .
          </>
        ) : nextRank ? (
          <>
            Next up is{' '}
            {getRankName(nextRank)}
            {nextRankThreshold
              ? ` at ${nextRankThreshold.toLocaleString()} points`
              : ''}
            .
          </>
        ) : (
          <>Top of the ladder.</>
        )}
        {canApply && !applyError && (
          <>
            {' '}
            Entering applies for it — a moderator confirms it, and that is what
            sets your rank in game and on Discord.
          </>
        )}
      </p>

      <div className={styles.revealActions}>
        <button
          type="button"
          className={styles.primary}
          onClick={onContinue}
          disabled={isApplying}
        >
          {isApplying
            ? `Applying for ${getRankName(rank)}…`
            : applyError
              ? 'Continue anyway'
              : 'Enter the Grotto'}
        </button>
        {applyError && (
          <p className={styles.revealError}>
            {applyError} You can apply again from your calculator.
          </p>
        )}
      </div>
    </div>
  );
}
