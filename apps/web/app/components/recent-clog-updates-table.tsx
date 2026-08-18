'use client';

import { BackpackIcon } from '@radix-ui/react-icons';
import { formatTimeAgo } from '@/app/utils/format-time-ago';
import { ItemImageWithFallback } from './item-image-with-fallback';
import { SectionHeader } from './section-header';
import { PlayerNameButton } from './player-name-button';
import styles from './activity-feed.module.css';

interface ClogUpdateData {
  id: string;
  playerName: string;
  itemName: string;
  itemId: number;
  count: number;
  dateFirstLogged: Date;
}

interface RecentClogUpdatesProps {
  clogUpdates: ClogUpdateData[];
}

export function RecentClogUpdatesTable({
  clogUpdates,
}: RecentClogUpdatesProps) {
  const header = (
    <div className={styles.header}>
      <SectionHeader
        title="Collection Log"
        subtitle="Latest drops logged by the clan"
        icon={<BackpackIcon width={18} height={18} />}
      />
    </div>
  );

  if (clogUpdates.length === 0) {
    return (
      <div className={styles.card}>
        {header}
        <div className={styles.empty}>
          No recent collection log updates
          <span className={styles.emptyHint}>
            New drops appear here as members log them
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.card}>
      {header}
      <div className={styles.list}>
        {clogUpdates.map((update) => (
          <div key={update.id} className={styles.row}>
            <div className={styles.tile}>
              <ItemImageWithFallback
                itemId={update.itemId}
                itemName={update.itemName}
                size={30}
              />
            </div>
            <div className={styles.body}>
              <span className={styles.title}>{update.itemName}</span>
              <span className={styles.meta}>
                <PlayerNameButton
                  name={update.playerName}
                  className={styles.player}
                />
              </span>
            </div>
            <div className={styles.trailing}>
              <span className={styles.time}>
                {formatTimeAgo(update.dateFirstLogged)}
              </span>
              {update.count > 1 && (
                <span className={styles.count}>&times;{update.count}</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
