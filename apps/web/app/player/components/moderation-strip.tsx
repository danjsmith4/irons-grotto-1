import {
  CheckCircledIcon,
  CrossCircledIcon,
  ExclamationTriangleIcon,
  InfoCircledIcon,
} from '@radix-ui/react-icons';
import { ReactNode } from 'react';
import { z } from 'zod';
import { useModeration } from '../contexts/moderation-context';
import styles from './rank-calculator.module.css';

const DataStatus = z.enum(['present', 'outdated', 'missing']);

type DataStatus = z.infer<typeof DataStatus>;

const statusClass = {
  present: styles.modPresent,
  outdated: styles.modOutdated,
  missing: styles.modMissing,
} satisfies Record<DataStatus, string>;

const statusIcons = {
  present: <CheckCircledIcon />,
  outdated: <ExclamationTriangleIcon />,
  missing: <CrossCircledIcon />,
} satisfies Record<DataStatus, ReactNode>;

function getDataSourceStatus(
  isDataSourcePresent: boolean,
  isDataSourceOutdated?: boolean,
): DataStatus {
  if (!isDataSourceOutdated) {
    return isDataSourcePresent ? 'present' : 'missing';
  }

  return isDataSourcePresent ? 'outdated' : 'missing';
}

/**
 * Moderator-only strip showing which third-party data sources backed this
 * submission, and whether any of them have changed since it was made.
 */
export function ModerationStrip() {
  const {
    hasTemplePlayerStats,
    hasTempleCollectionLog,
    hasWikiSyncData,
    isModerator,
    actionedByUsername,
    isTempleCollectionLogOutdated,
    dataFreshnessInfo,
  } = useModeration();

  if (!isModerator) {
    return null;
  }

  const moderationData = [
    ['TempleOSRS stats', getDataSourceStatus(hasTemplePlayerStats)],
    [
      'TempleOSRS clog',
      getDataSourceStatus(
        hasTempleCollectionLog,
        isTempleCollectionLogOutdated,
      ),
    ],
    ['WikiSync', getDataSourceStatus(hasWikiSyncData)],
  ] as const;

  return (
    <aside className={styles.modStrip} aria-label="Moderator info">
      <span className={styles.modLabel}>
        Data sources{dataFreshnessInfo?.isUsingFreshData ? ' (live)' : ''}
      </span>
      {moderationData.map(([label, status]) => (
        <span key={label} className={styles.modItem}>
          <span className={statusClass[status]}>{statusIcons[status]}</span>
          {label}
        </span>
      ))}
      {actionedByUsername && (
        <span className={styles.modItem}>Actioned by {actionedByUsername}</span>
      )}
      {dataFreshnessInfo?.hasTempleCollectionLogStatusChanged && (
        <span className={`${styles.modItem} ${styles.modNote}`}>
          <ExclamationTriangleIcon />
          Collection log status changed since submission
        </span>
      )}
      {dataFreshnessInfo?.hasOtherDataChanged && (
        <span
          className={`${styles.modItem} ${styles.modNote} ${styles.modNoteInfo}`}
        >
          <InfoCircledIcon />
          Other data sources changed since submission
        </span>
      )}
    </aside>
  );
}
