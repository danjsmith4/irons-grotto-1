'use client';

import { useEffect, useState } from 'react';
import { minimumJoinTotalLevel } from '@/config/clan-requirements';
import { clientConstants } from '@/config/constants.client';
import { TrophyWall } from './trophy-wall';
import type { AchievementKey } from '../scan-types';
import styles from '../join.module.css';

interface ThresholdRevealProps {
  playerName: string;
  /** Their total level, as the scan settled it. */
  totalLevel: number;
  /** How far under the clan's minimum they are. */
  shortfall: number;
  /** The scan registered this account on TempleOSRS just now. */
  didRegisterOnTemple: boolean;
  earned: Set<AchievementKey>;
  settledSources: number;
  isRechecking: boolean;
  onRecheck: () => void;
  onBackToDashboard: () => void;
}

/**
 * What someone sees when their account is under the clan's minimum total level.
 *
 * ⚠️ **This is a destination, not an error.** It is deliberately built from the
 * rank reveal's vocabulary — the same badge, meter, staged `rise` delays and
 * reduced-motion fallback — rather than the warn-card treatment the collection
 * log gate uses, because the two situations are not alike. A stale collection
 * log is a thing to go and fix in the next five minutes; a total level is weeks
 * of play, and a screen that reads as a rejection is one nobody comes back
 * from. The job here is to leave someone wanting to reach 1,500.
 *
 * Three things do that work, and the scan has already paid for all of them:
 *
 * 1. **Their level is the hero.** It sits where the rank crest sits on the
 *    reveal, in display type, with the meter under it showing how much of the
 *    way there they are. Framed as progress, which is what it is.
 * 2. **The trophy wall stays.** Everything the scan found is theirs whether or
 *    not they qualify today, and showing someone their own infernal cape while
 *    asking them to come back is the difference between an invitation and a
 *    door.
 * 3. **They leave with something.** The Temple step registered their account,
 *    so their stats start accruing from today — said only when it actually
 *    happened.
 *
 * The number is not a rank crest and not a skills icon: an unverified wiki
 * image name renders as alt text sprawling across the row, and this is the one
 * screen that cannot afford that.
 */
export function ThresholdReveal({
  playerName,
  totalLevel,
  shortfall,
  didRegisterOnTemple,
  earned,
  settledSources,
  isRechecking,
  onRecheck,
  onBackToDashboard,
}: ThresholdRevealProps) {
  // Held at zero for a frame so the meter fills from empty on mount rather than
  // rendering already full — the same trick, and the same reason, as RankReveal.
  const [meterWidth, setMeterWidth] = useState(0);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const progress = totalLevel / minimumJoinTotalLevel;

      setMeterWidth(Math.max(2, Math.min(100, progress * 100)));
    });

    return () => window.cancelAnimationFrame(frame);
  }, [totalLevel]);

  return (
    <div className={styles.reveal}>
      <p className={`${styles.eyebrow} ${styles.revealLead}`}>
        You&apos;re on your way
      </p>

      <div className={styles.revealBadge}>
        <span className={styles.revealHalo} />
        <span className={styles.revealRing} />
        <span className={styles.thresholdValue}>
          {totalLevel.toLocaleString()}
        </span>
      </div>

      <p className={styles.thresholdUnit}>{playerName}&apos;s total level</p>

      <div className={styles.meter}>
        <div className={styles.meterFill} style={{ width: `${meterWidth}%` }} />
      </div>

      <p className={styles.thresholdGoal}>
        <strong>{shortfall.toLocaleString()} to go.</strong> Irons Grotto
        requires {minimumJoinTotalLevel.toLocaleString()} total level or higher.
      </p>

      <TrophyWall earned={earned} settledSources={settledSources} />

      <p className={styles.revealNote}>
        {didRegisterOnTemple
          ? "We've added your account to TempleOSRS, so your stats are being tracked from now on. Get there and everything here will be waiting for you."
          : 'Your stats are tracked on TempleOSRS. Get there and the Grotto here will be waiting for you.'}
      </p>

      <div className={styles.revealActions}>
        <button
          type="button"
          className={styles.primary}
          onClick={onRecheck}
          disabled={isRechecking}
        >
          {isRechecking ? 'Checking…' : 'Check again'}
        </button>
        <div className={styles.thresholdSecondary}>
          {/*
            The Discord is the point of this screen. Someone who wants in but is
            not in yet can be part of the clan's community while they train,
            which is also how the clan keeps them rather than losing them to the
            next one they find. It carries the same weight as leaving, so it
            gets a button rather than a line of underlined text.

            Still an anchor, because it goes somewhere off this site: middle
            click and open-in-new-tab have to keep working. `.ghostLink` is only
            what makes an inline anchor sit correctly in a button's padding.
          */}
          <a
            className={`${styles.ghost} ${styles.ghostLink}`}
            href={clientConstants.discord.inviteUrl}
            target="_blank"
            rel="noreferrer"
          >
            Join our Discord
          </a>
          <button
            type="button"
            className={styles.ghost}
            onClick={onBackToDashboard}
          >
            Back to dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
