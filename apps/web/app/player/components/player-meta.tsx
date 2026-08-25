'use client';

import { useId, useState } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
import { format } from 'date-fns';
import { Button, Dialog } from '@radix-ui/themes';
import { Link1Icon } from '@radix-ui/react-icons';
import { Input } from './input';
import { RankCalculatorSchema } from '../[player]/submit-rank-calculator-validation';
import { useCalculatorScaling } from '../hooks/point-calculator/use-calculator-scaling';
import { formatPercentage } from '../utils/format-percentage';
import styles from './rank-calculator.module.css';

/**
 * The scoreboard's footer strip: the submission's supporting facts (when the
 * player joined, and the join-date scaling that multiplies every item).
 *
 * The proof link is editable, so it sits behind a modal rather than as an
 * inline field — it's a rarely-touched value that was dominating the strip.
 */
export function PlayerMeta() {
  const {
    register,
    formState: { defaultValues },
  } = useFormContext<RankCalculatorSchema>();
  const joinDate = useWatch<RankCalculatorSchema, 'joinDate'>({
    name: 'joinDate',
  });
  const proofLink = useWatch<RankCalculatorSchema, 'proofLink'>({
    name: 'proofLink',
  });
  const scaling = useCalculatorScaling();
  const [isProofOpen, setIsProofOpen] = useState(false);
  const joinDateId = useId();
  const scalingId = useId();
  const proofInputId = useId();

  return (
    <>
      <div className={styles.metaItem}>
        <span className={styles.metaLabel} id={joinDateId}>
          Join date
        </span>
        <span
          aria-labelledby={joinDateId}
          className={`${styles.metaValue} ${styles.metaNumeric}`}
        >
          {format(joinDate, 'dd MMM yyyy')}
        </span>
      </div>
      <div className={styles.metaItem}>
        <span className={styles.metaLabel} id={scalingId}>
          Point scaling
        </span>
        <span
          aria-labelledby={scalingId}
          className={`${styles.metaValue} ${styles.metaNumeric}`}
        >
          {formatPercentage(scaling)}
        </span>
      </div>

      <button
        type="button"
        className={styles.metaButton}
        aria-haspopup="dialog"
        onClick={() => {
          setIsProofOpen(true);
        }}
      >
        <span
          className={`${styles.metaDot} ${proofLink ? styles.metaDotSet : ''}`}
          aria-hidden
        />
        {proofLink ? 'Proof link' : 'Add proof link'}
      </button>

      <Dialog.Root open={isProofOpen} onOpenChange={setIsProofOpen}>
        <Dialog.Content
          maxWidth="520px"
          className={styles.modal}
          aria-describedby={undefined}
        >
          <div className={styles.modalHeader}>
            <span className={styles.panelIcon} aria-hidden>
              <Link1Icon />
            </span>
            <Dialog.Title className={styles.modalTitle}>
              Proof link
            </Dialog.Title>
          </div>
          <div className={styles.proofField}>
            <label className={styles.metaLabel} htmlFor={proofInputId}>
              Link to your proof
            </label>
            <Input
              {...register('proofLink')}
              id={proofInputId}
              aria-label="Proof link"
              defaultValue={defaultValues?.proofLink ?? ''}
              placeholder="https://…"
              size="2"
              hasError={false}
            />
            <span className={styles.proofHint}>
              A screenshot or clip backing up anything the third-party data
              sources can&apos;t confirm.
            </span>
          </div>
          <div className={styles.modalFooter}>
            <Dialog.Close>
              <Button variant="soft" color="gray">
                Done
              </Button>
            </Dialog.Close>
          </div>
        </Dialog.Content>
      </Dialog.Root>
    </>
  );
}
