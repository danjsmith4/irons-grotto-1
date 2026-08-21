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
  iconItemName: string | null;
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

  if (accomplishments.length === 0) {
    return (
      <div className={styles.card}>
        {header}
        <div className={styles.empty}>
          No recent accomplishments
          <span className={styles.emptyHint}>
            Milestones appear here as members reach them
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.card}>
      {header}
      <div className={styles.list}>
        {accomplishments.map((accomplishment) => {
          // A pet is its own picture; everything else is identified by its type.
          const iconName =
            accomplishment.iconItemName ??
            accomplishmentTypeIcons[accomplishment.type];

          return (
            <div key={accomplishment.id} className={styles.row}>
              <div className={styles.tile}>
                <ItemImageWithFallback itemName={iconName} size={30} />
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
