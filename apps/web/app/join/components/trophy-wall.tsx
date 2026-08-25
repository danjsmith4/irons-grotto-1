'use client';

import Image from 'next/image';
import { formatWikiImageUrl } from '@/app/player/utils/format-wiki-url';
import { achievementDefinitions, type AchievementKey } from '../scan-types';
import styles from '../join.module.css';

interface TrophyWallProps {
  /** Which achievements have been settled *and* revealed so far. */
  earned: Set<AchievementKey>;
  /** How many of the three sources have finished revealing. */
  settledSources: number;
}

/**
 * The headline achievements, greyed out and lighting up as their source lands.
 *
 * These are the same items the leaderboard puts against a name, so a member who
 * has seen the leaderboard already knows what they mean. Radiant Oathplate is
 * missing on purpose — nothing reports it, so it is a claim the player ticks in
 * the calculator rather than something a scan could ever light up.
 *
 * Everything stays on screen from the start. A tile appearing when it is earned
 * would hide the shape of what is being checked, and the greyed-out ones are
 * half the information: this is what there is to get.
 */
export function TrophyWall({ earned, settledSources }: TrophyWallProps) {
  const total = achievementDefinitions.length;

  return (
    <div>
      <div className={styles.trophies}>
        {achievementDefinitions.map(({ key, image, label }) => {
          const isEarned = earned.has(key);

          return (
            <div
              key={key}
              className={`${styles.trophy} ${isEarned ? styles.trophyEarned : ''}`}
              title={isEarned ? label : `${label} — not found`}
              role="img"
              aria-label={isEarned ? `${label}: found` : `${label}: not found`}
            >
              <Image
                src={formatWikiImageUrl(image)}
                // Decorative: the tile above carries the accessible name. An
                // empty alt also means a wiki file that has been renamed
                // collapses to nothing instead of spilling its label across the
                // row, which is what a 404 here used to look like.
                alt=""
                width={32}
                height={32}
                style={{ objectFit: 'contain', maxWidth: '100%' }}
                unoptimized
              />
            </div>
          );
        })}
      </div>
      <p className={styles.trophyCaption}>
        {settledSources === 0
          ? `Checking ${total} headline achievements…`
          : `${earned.size} of ${total} found so far.`}
      </p>
    </div>
  );
}
