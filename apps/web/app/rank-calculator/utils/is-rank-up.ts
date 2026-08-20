import { Rank } from '@/config/enums';
import { rankThresholdsFor } from '@/config/ranks';
import { AccountType, staffRoleRanks } from '@/app/schemas/staff';

/**
 * The in-game clan ranks staff wear. They predate the points-only model and
 * still sit in `players.rank` for anyone who held one before the staff-role
 * migration, but they are on no points ladder, so they can never equal a
 * calculated rank.
 */
const staffRanks = new Set<Rank>(Object.values(staffRoleRanks));

/**
 * Whether moving from the player's stored rank to a freshly calculated one is a
 * promotion worth announcing — the question behind both the calculator's rank-up
 * dialog and the auto-rank Discord nudge.
 *
 * A plain `calculated !== stored` inequality gets this wrong twice:
 *
 * - **Staff.** A moderator's stored rank is `Moderator`, which is not on the
 *   ladder and never will be, so the inequality holds on every single load and
 *   the player is told to apply for a rank they may already effectively hold.
 *   A staff rank says nothing about points progress, so it is treated as
 *   unknown rather than as "behind".
 * - **Demotions.** A recalculation that lands lower than the stored rank (a
 *   correction, a throttle that has kicked in, or a switch to the main ladder)
 *   is not something to congratulate anyone for.
 *
 * A stored rank that is off the ladder for any other reason — `Unranked`, or a
 * rank carried over from a different account type — is genuinely behind it, so
 * the first real rank still gets announced.
 */
export function isRankUp(
  currentRank: Rank | null | undefined,
  calculatedRank: Rank,
  accountType: AccountType | null,
) {
  if (!currentRank || currentRank === calculatedRank) {
    return false;
  }

  if (staffRanks.has(currentRank)) {
    return false;
  }

  const ladder = Object.keys(rankThresholdsFor(accountType)) as Rank[];
  const calculatedIndex = ladder.indexOf(calculatedRank);

  // Nothing on this ladder to apply for.
  if (calculatedIndex === -1) {
    return false;
  }

  // -1 for an off-ladder stored rank, which sorts it below every rank on it.
  return calculatedIndex > ladder.indexOf(currentRank);
}
