import Image from 'next/image';
import {
  AccountType,
  accountTypeChatBadges,
  accountTypeLabels,
} from '@/app/schemas/staff';
import { formatWikiImageUrl } from '@/app/rank-calculator/utils/format-wiki-url';

interface AccountTypeBadgeProps {
  accountType: AccountType | null | undefined;
  size?: number;
}

/**
 * The account's in-game chat badge.
 *
 * A main has no badge in game and gets none here; an unresolved account gets
 * nothing either, since we would only be guessing. Both render as absence,
 * which is the same thing the game does. Callers that need the name after the
 * badge to stay put give it a fixed-width slot rather than a filler icon — see
 * `.badgeSlot` in the leaderboard.
 */
export function AccountTypeBadge({
  accountType,
  size = 14,
}: AccountTypeBadgeProps) {
  if (!accountType || accountType === 'main') {
    return null;
  }

  const label = accountTypeLabels[accountType];

  return (
    <Image
      src={formatWikiImageUrl(accountTypeChatBadges[accountType])}
      alt={label}
      title={label}
      width={size}
      height={size}
      style={{ objectFit: 'contain', verticalAlign: 'middle' }}
      unoptimized
    />
  );
}
