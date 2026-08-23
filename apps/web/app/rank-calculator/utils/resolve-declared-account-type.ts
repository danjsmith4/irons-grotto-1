'use server';

import { AccountType, AccountTypeChoice } from '@/app/schemas/staff';
import { resolveTempleAccountType } from '@/app/schemas/temple-api';
import { ensureTrackedOnTemple } from '../data-sources/ensure-tracked-on-temple';

export type ResolvedDeclaredAccountType =
  | {
      status: 'resolved';
      accountType: AccountType;
      gimGroupName: string | null;
    }
  /**
   * TempleOSRS does not yet know this account is a group ironman, which in
   * practice always means the group is not on Temple's GIM tracking.
   *
   * Never silently downgraded to unranked: an untracked ranked group and a
   * genuinely unranked one are indistinguishable from here, and only the
   * player can say which it is. They are pointed at Temple instead, via
   * `clientConstants.temple.gimTrackingUrl`.
   */
  | { status: 'group-not-tracked' };

/**
 * Turns what a player tells us about their account into a stored type.
 *
 * A claimed group ironman is confirmed against **TempleOSRS**, which is the
 * only source of truth this app has for a game mode. Temple exposes a per
 * player `GIM` field — 12–15 for a regular group, 22–25 for a hardcore one —
 * and it populates as soon as the group is on Temple's GIM tracking. Verified
 * 2026-08-22: `FriccKip` of `friccnhecc` (tracked) reports `GIM 12`, while
 * `WhoKnowSteve` of `drippybros` (untracked) reports `GIM 0`, indistinguishable
 * from a main.
 *
 * So the flow is: get the account onto Temple, ask Temple, and if Temple still
 * cannot see a group, tell the player to add theirs to Temple's GIM tracking
 * and try again. That is a thing they can actually go and do, and it fixes the
 * answer permanently rather than just for us.
 *
 * **This deliberately does not consult the OSRS hiscores.** It used to scrape
 * the Jagex group boards to prove the group existed, prove the player was in
 * it, and read regular-vs-hardcore off whichever board matched. All of that
 * only ever decided a *badge*: `rankThresholdsFor` branches on nothing but
 * `isMainAccount`, so every ironman variant scores on the identical ladder.
 * A second source of truth for no change in outcome is a cost with no benefit,
 * so it is gone. Don't reintroduce it.
 *
 * `gimGroupName` is now the player's own label rather than a verified fact —
 * Temple settles the *mode*, and nothing needs the name to do it.
 */
export async function resolveDeclaredAccountType(
  playerName: string,
  choice: AccountTypeChoice,
  groupName?: string,
): Promise<ResolvedDeclaredAccountType> {
  if (choice !== 'group_ironman') {
    return { status: 'resolved', accountType: choice, gimGroupName: null };
  }

  // Registers the account if Temple has never seen it, then re-polls — an
  // untracked account cannot report a GIM field it does not have yet.
  const { info } = await ensureTrackedOnTemple(playerName);
  const accountType = info
    ? resolveTempleAccountType(info['Game mode'], info.GIM)
    : null;

  // Temple can only be believed here when it names a group mode. Anything else
  // — a main reading, a solo ironman reading, no record at all — means the
  // group is not tracked, which is the one thing the player can fix.
  if (
    accountType !== 'group_ironman' &&
    accountType !== 'hardcore_group_ironman'
  ) {
    return { status: 'group-not-tracked' };
  }

  const trimmedGroupName = groupName?.trim();

  return {
    status: 'resolved',
    accountType,
    gimGroupName: trimmedGroupName?.length ? trimmedGroupName : null,
  };
}
