import { StarFilledIcon } from '@radix-ui/react-icons';
import type { CollectionLogInsights } from '../data-sources/fetch-collection-log-insights';
import { ItemImageWithFallback } from './item-image-with-fallback';
import { SectionHeader } from './section-header';
import styles from './rarest-drops.module.css';

interface RarestDropsProps {
  insights: CollectionLogInsights;
}

export function RarestDrops({ insights }: RarestDropsProps) {
  if (insights.rarest.length === 0) return null;

  return (
    <div className={styles.card}>
      <SectionHeader
        title="Rarest in the Grotto"
        subtitle="Collection-log items the fewest members have logged"
        icon={<StarFilledIcon width={16} height={16} />}
      />
      <div className={styles.strip}>
        {insights.rarest.map((item) => (
          <div key={item.itemId} className={styles.item}>
            <div className={styles.tile}>
              <ItemImageWithFallback
                itemId={item.itemId}
                itemName={item.itemName}
                size={44}
              />
            </div>
            <span className={styles.name}>{item.itemName}</span>
            <span
              className={`${styles.owners} ${item.owners === 1 ? styles.solo : ''}`}
            >
              {item.owners === 1
                ? `Only ${item.sampleOwner}`
                : `${item.owners} members`}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
