import { CheckIcon, Cross2Icon, ExclamationTriangleIcon } from '@radix-ui/react-icons';
import styles from '../join.module.css';

export type StepStatus = 'idle' | 'running' | 'ok' | 'warn' | 'fail';

interface StatusIndicatorProps {
  status: StepStatus;
}

/**
 * The spinner that becomes a tick, a warning or a cross.
 *
 * Four states rather than two, because "we asked and the answer was no" is not
 * a failure — an account with no WikiSync upload has nothing wrong with it, and
 * marking it with a red cross would tell the player they had broken something.
 * `idle` is the queued state: the request may already be in flight, but this
 * row has not had its turn yet.
 */
export function StatusIndicator({ status }: StatusIndicatorProps) {
  if (status === 'idle') {
    return (
      <span className={styles.indicator} aria-hidden>
        <span className={styles.indicatorIdle} />
      </span>
    );
  }

  if (status === 'running') {
    return (
      <span className={styles.indicator} aria-hidden>
        <span className={styles.indicatorRing} />
      </span>
    );
  }

  const tone =
    status === 'ok'
      ? styles.indicatorOk
      : status === 'warn'
        ? styles.indicatorWarn
        : styles.indicatorFail;

  return (
    <span className={styles.indicator} aria-hidden>
      <span className={`${styles.indicatorMark} ${tone}`}>
        {status === 'ok' && <CheckIcon width={12} height={12} />}
        {status === 'warn' && <ExclamationTriangleIcon width={11} height={11} />}
        {status === 'fail' && <Cross2Icon width={12} height={12} />}
      </span>
    </span>
  );
}
