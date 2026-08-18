'use client';

import Image from 'next/image';
import { ArrowUpIcon } from '@radix-ui/react-icons';
import { getRankImageUrl } from '@/app/rank-calculator/utils/get-rank-image-url';
import { getRankName } from '@/app/rank-calculator/utils/get-rank-name';
import { Rank } from '@/config/enums';
import { formatTimeAgo } from '@/app/utils/format-time-ago';
import { SectionHeader } from './section-header';
import { PlayerNameButton } from './player-name-button';
import styles from './activity-feed.module.css';

interface RankUpData {
  id: string;
  playerName: string;
  oldRank: string | null;
  newRank: string;
  createdAt: Date;
}

interface RecentRankUpsProps {
  rankUps: RankUpData[];
}

function RankIcon({ rank }: { rank: string }) {
  return (
    <Image
      src={getRankImageUrl(rank as Rank)}
      alt={`${getRankName(rank as Rank)} rank`}
      width={20}
      height={20}
      style={{ borderRadius: '50%' }}
    />
  );
}

export function RecentRankUpsTable({ rankUps }: RecentRankUpsProps) {
  const header = (
    <div className={styles.header}>
      <SectionHeader
        title="Rank Ups"
        subtitle="Latest promotions within the clan"
        icon={<ArrowUpIcon width={18} height={18} />}
      />
    </div>
  );

  if (rankUps.length === 0) {
    return (
      <div className={styles.card}>
        {header}
        <div className={styles.empty}>
          No recent rank ups
          <span className={styles.emptyHint}>
            Promotions appear here as members are ranked up
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.card}>
      {header}
      <div className={styles.list}>
        {rankUps.map((rankUp) => (
          <div key={rankUp.id} className={styles.row}>
            <div className={styles.tile}>
              <RankIcon rank={rankUp.newRank} />
            </div>
            <div className={styles.body}>
              <span className={styles.title}>
                <PlayerNameButton
                  name={rankUp.playerName}
                  className={styles.player}
                />
              </span>
              <span className={styles.rankFlow}>
                <span className={styles['rankName--muted']}>
                  {rankUp.oldRank ? getRankName(rankUp.oldRank as Rank) : 'Unranked'}
                </span>
                <ArrowUpIcon
                  className={styles.arrow}
                  width={12}
                  height={12}
                  style={{ transform: 'rotate(90deg)' }}
                />
                <span className={styles.rankName}>
                  {getRankName(rankUp.newRank as Rank)}
                </span>
              </span>
            </div>
            <div className={styles.trailing}>
              <span className={styles.time}>
                {formatTimeAgo(rankUp.createdAt)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
