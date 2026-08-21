'use client';

import { StarIcon } from '@radix-ui/react-icons';
import { formatTimeAgo } from '@/app/utils/format-time-ago';
import {
  AccomplishmentType,
  accomplishmentTypeIcons,
  accomplishmentTypeLabels,
} from '@/app/schemas/accomplishments';
import { ItemImageWithFallback } from './item-image-with-fallback';
import { SectionHeader } from './section-header';
import { PlayerNameButton } from './player-name-button';
import styles from './activity-feed.module.css';

interface AccomplishmentData {
  id: string;
  playerName: string;
  type: AccomplishmentType;
  label: string;
  achievedAt: Date;
}

interface RecentAccomplishmentsProps {
  accomplishments: AccomplishmentData[];
}

export function RecentAccomplishmentsTable({
  accomplishments,
}: RecentAccomplishmentsProps) {
  const header = (
    <div className={styles.header}>
      <SectionHeader
        title="Accomplishments"
        subtitle="Milestones and feats across the clan"
        icon={<StarIcon width={18} height={18} />}
      />
    </div>
  );

  // Renders nothing rather than an empty-state card — this feed starts empty
  // by design (a player's first detection pass is backfill and stays out of
  // it), so a "nothing has happened yet" card would be the homepage's
  // headline for weeks after launch. Callers already guard on length to avoid
  // leaving a gap in their flex layout; this is the backstop.
  if (accomplishments.length === 0) {
    return null;
  }

  return (
    <div className={styles.card}>
      {header}
      <div className={styles.list}>
        {accomplishments.map((accomplishment) => {
          return (
            <div key={accomplishment.id} className={styles.row}>
              <div className={styles.tile}>
                <ItemImageWithFallback
                  itemName={accomplishmentTypeIcons[accomplishment.type]}
                  size={30}
                />
              </div>
              <div className={styles.body}>
                <span className={styles.title}>{accomplishment.label}</span>
                <span className={styles.meta}>
                  <PlayerNameButton
                    name={accomplishment.playerName}
                    className={styles.player}
                  />
                  <span className={styles.dot}>·</span>
                  {accomplishmentTypeLabels[accomplishment.type]}
                </span>
              </div>
              <div className={styles.trailing}>
                <span className={styles.time}>
                  {formatTimeAgo(accomplishment.achievedAt)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
