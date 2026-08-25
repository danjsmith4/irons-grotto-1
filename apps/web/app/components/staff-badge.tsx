import Image from 'next/image';
import { getRankImageUrl } from '@/app/player/utils/get-rank-image-url';
import { getRankName } from '@/app/player/utils/get-rank-name';
import { StaffRole, staffRoleRanks } from '@/app/schemas/staff';
import styles from './staff-badge.module.css';

interface StaffBadgeProps {
  role: StaffRole | null | undefined;
  /** Drops the label and the chip, leaving just the icon. */
  iconOnly?: boolean;
  size?: number;
}

/**
 * A player's staff standing, worn next to their name. It is deliberately not a
 * rank: staff are ranked on points like everyone else, and this only says what
 * they also do for the clan.
 */
export function StaffBadge({
  role,
  iconOnly = false,
  size = 14,
}: StaffBadgeProps) {
  if (!role) {
    return null;
  }

  const rank = staffRoleRanks[role];
  const name = getRankName(rank);

  return (
    <span
      className={`${styles.badge} ${iconOnly ? styles.iconOnly : ''}`}
      title={iconOnly ? name : undefined}
    >
      <Image
        className={styles.icon}
        src={getRankImageUrl(rank)}
        alt={iconOnly ? name : ''}
        aria-hidden={!iconOnly}
        width={size}
        height={size}
        unoptimized
      />
      {!iconOnly && <span className={styles.label}>{name}</span>}
    </span>
  );
}
