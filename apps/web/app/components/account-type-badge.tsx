import Image from 'next/image';
import {
  AccountType,
  accountTypeChatBadges,
  accountTypeLabels,
} from '@/app/schemas/staff';
import { formatWikiImageUrl } from '@/app/rank-calculator/utils/format-wiki-url';
import { getRankImageUrl } from '@/app/rank-calculator/utils/get-rank-image-url';
import { mainAccountRank } from '@/config/ranks';

interface AccountTypeBadgeProps {
  accountType: AccountType | null | undefined;
  size?: number;
}

/**
 * The account's in-game chat badge.
 *
 * A main has no chat badge in game, so it borrows the icon of the single rank
 * mains are ever sorted into — every resolved account gets a mark, and lists
 * that lead with this badge keep one shared left edge.
 *
 * An unresolved account still renders nothing: it is the one case where we
 * would only be guessing, and absence is what makes the calculator ask.
 */
export function AccountTypeBadge({
  accountType,
  size = 14,
}: AccountTypeBadgeProps) {
  if (!accountType) {
    return null;
  }

  const label = accountTypeLabels[accountType];
  const src =
    accountType === 'main'
      ? getRankImageUrl(mainAccountRank)
      : formatWikiImageUrl(accountTypeChatBadges[accountType]);

  return (
    <Image
      src={src}
      alt={label}
      title={label}
      width={size}
      height={size}
      style={{ objectFit: 'contain', verticalAlign: 'middle' }}
      unoptimized
    />
  );
}
