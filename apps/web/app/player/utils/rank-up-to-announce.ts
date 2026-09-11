import { Rank } from '@/config/enums';
import { canApplyForRank } from '@/config/ranks';
import { AccountType } from '@/app/schemas/staff';
import { isRankUp } from './is-rank-up';

export interface RankUpAnnouncementInput {
  /** `players.rank` — the rank the member actually holds. */
  heldRank: Rank | null | undefined;
  /** The rank their record scored to before this refresh. */
  previousRank: Rank;
  /** The rank their record scores to now. */
  calculatedRank: Rank;
  accountType: AccountType | null;
  /** The last rank they were messaged about for this account, if any. */
  lastAnnouncedRank: Rank | null | undefined;
}

/**
 * Which rank, if any, to message a member about after a refresh.
 *
 * **It announces a crossing, not a standing.** The refresh has to be what moved
 * them: the rank their record scores to must be higher than it was a moment
 * ago. Eligibility alone is not enough, because plenty of members sit above
 * their held rank for months without applying — they know, and a DM on every
 * run (or, deduped, on the day this shipped) is noise rather than news.
 *
 * On top of that, the usual rank-up rules:
 *
 * - it has to be a promotion over the rank they *hold* ({@link isRankUp}) —
 *   crossing Corporal is nothing to celebrate for someone already Sergeant;
 * - the account has to be able to apply ({@link canApplyForRank}), since the
 *   message sends them to an application a main would be refused;
 * - and they must not already have been told about this rank or a higher one,
 *   so a total that dips under a threshold and climbs back does not announce
 *   the same rank twice.
 */
export function rankUpToAnnounce({
  heldRank,
  previousRank,
  calculatedRank,
  accountType,
  lastAnnouncedRank,
}: RankUpAnnouncementInput): Rank | null {
  if (!canApplyForRank(accountType)) {
    return null;
  }

  if (!isRankUp(previousRank, calculatedRank, accountType)) {
    return null;
  }

  if (!isRankUp(heldRank, calculatedRank, accountType)) {
    return null;
  }

  if (
    lastAnnouncedRank &&
    !isRankUp(lastAnnouncedRank, calculatedRank, accountType)
  ) {
    return null;
  }

  return calculatedRank;
}
