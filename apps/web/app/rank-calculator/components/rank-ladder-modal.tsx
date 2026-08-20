import { useState, useTransition } from 'react';
import { Button, Dialog } from '@radix-ui/themes';
import Image from 'next/image';
import { Rank } from '@/config/enums';
import { rankThresholds } from '@/config/ranks';
import { getRankName } from '../utils/get-rank-name';
import { formatNumber } from '../utils/format-number';
import { getRankImageUrl } from '../utils/get-rank-image-url';
import styles from './rank-calculator.module.css';

/** The one points ladder, and what each rank costs. */
export function RankLadderModal({ currentRank }: { currentRank?: Rank }) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(isOpen) => {
        startTransition(() => {
          setOpen(isOpen);
        });
      }}
    >
      <Dialog.Trigger>
        <Button loading={isPending} size="2" variant="soft">
          View ranks
        </Button>
      </Dialog.Trigger>
      <Dialog.Content
        maxWidth="360px"
        className={styles.modal}
        aria-describedby={undefined}
      >
        <div className={styles.modalHeader}>
          <Dialog.Title className={styles.modalTitle}>Ranks</Dialog.Title>
        </div>
        <div className={styles.modalBody}>
          <div className={`${styles.ladderRow} ${styles.ladderHead}`}>
            <span />
            <span>Rank</span>
            <span>Points</span>
          </div>
          {Object.entries(rankThresholds).map(([rank, points]) => (
            <div
              key={rank}
              className={`${styles.ladderRow} ${
                rank === currentRank ? styles.ladderCurrent : ''
              }`}
              aria-current={rank === currentRank ? 'true' : undefined}
            >
              <Image
                alt=""
                aria-hidden
                src={getRankImageUrl(rank as Rank)}
                height={18}
                width={18}
                unoptimized
              />
              <span className={styles.ladderRank}>
                {getRankName(rank as Rank)}
              </span>
              <span className={styles.ladderPoints}>
                {formatNumber(points)}
              </span>
            </div>
          ))}
        </div>
        <div className={styles.modalFooter}>
          <Dialog.Close>
            <Button variant="soft" color="gray">
              Close
            </Button>
          </Dialog.Close>
        </div>
      </Dialog.Content>
    </Dialog.Root>
  );
}
