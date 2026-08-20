'use client';

import { PropsWithChildren, ReactNode, useState } from 'react';
import { Button, Dialog } from '@radix-ui/themes';
import styles from '../rank-calculator.module.css';

interface PanelProps {
  /** Category name — also the tile's heading and the modal's title. */
  title: string;
  icon?: ReactNode;
  /** Formatted points total for the category. */
  total: ReactNode;
  /** Accessible name for the total, e.g. "Total combat points". */
  totalLabel: string;
  /** Completion, 0–1. Drives the meter. */
  percentage: number;
  percentageText: string;
  percentageLabel: string;
  remaining: ReactNode;
  remainingLabel: string;
}

function Meter({ percentage }: { percentage: number }) {
  return (
    <div className={styles.meterTrack}>
      <div
        className={styles.meterFill}
        style={{ width: `${Math.min(100, Math.max(0, percentage * 100))}%` }}
      />
    </div>
  );
}

/**
 * A category as a summary tile that opens its inputs in a modal.
 *
 * The tile is read-only at a glance (points, completion, points remaining);
 * everything editable lives behind the modal, because nobody edits two
 * categories at once and the page is dense enough already.
 */
export function Panel({
  title,
  icon,
  total,
  totalLabel,
  percentage,
  percentageText,
  percentageLabel,
  remaining,
  remainingLabel,
  children,
}: PropsWithChildren<PanelProps>) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <div className={styles.tile}>
        <div className={styles.tileHead}>
          <span className={styles.panelIcon} aria-hidden>
            {icon}
          </span>
          {/* Heading wraps the trigger so the tile keeps its semantics while
              the button stretches over the whole card (see .tileTrigger::after). */}
          <h3 className={styles.panelHeading}>
            <button
              type="button"
              className={styles.tileTrigger}
              aria-haspopup="dialog"
              onClick={() => {
                setIsOpen(true);
              }}
            >
              <span className={styles.panelTitle}>{title}</span>
            </button>
          </h3>
          <span className={styles.panelTotal} aria-label={totalLabel}>
            {total}
          </span>
        </div>
        <div className={styles.panelMeterMeta}>
          <span aria-label={percentageLabel}>{percentageText}</span>
          <span aria-label={remainingLabel}>{remaining}</span>
        </div>
        <Meter percentage={percentage} />
      </div>

      <Dialog.Root open={isOpen} onOpenChange={setIsOpen}>
        <Dialog.Content
          maxWidth="560px"
          className={styles.modal}
          aria-describedby={undefined}
        >
          <div className={styles.modalHeader}>
            <span className={styles.panelIcon} aria-hidden>
              {icon}
            </span>
            <Dialog.Title className={styles.modalTitle}>{title}</Dialog.Title>
            <div className={styles.modalTotal}>
              <div className={styles.modalTotalValue}>{total}</div>
              <div className={styles.totalLabel}>Points</div>
            </div>
          </div>
          <div className={styles.modalMeter}>
            <div className={styles.panelMeterMeta}>
              <span>{percentageText} complete</span>
              <span>{remaining}</span>
            </div>
            <Meter percentage={percentage} />
          </div>
          <div className={styles.modalBody}>{children}</div>
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

interface PanelFieldProps {
  label: ReactNode;
  /** Middle column — an input, select or checkbox. Omit for label/value rows. */
  control?: ReactNode;
  points: ReactNode;
  /** Renders the row as the body's column header. */
  isHeader?: boolean;
  /** Highlights the points cell as a bonus (green). */
  isBonus?: boolean;
}

/** One `label | control | points` row inside a category modal. */
export function PanelField({
  label,
  control = null,
  points,
  isHeader = false,
  isBonus = false,
}: PanelFieldProps) {
  return (
    <div className={`${styles.field} ${isHeader ? styles.fieldHead : ''}`}>
      <div className={styles.fieldLabel}>{label}</div>
      <div className={styles.fieldControl}>{control}</div>
      <div
        className={`${styles.fieldPoints} ${isBonus ? styles.fieldBonus : ''}`}
      >
        {points}
      </div>
    </div>
  );
}
