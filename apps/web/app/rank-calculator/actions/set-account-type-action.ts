'use server';

import { updatePlayerAccountType } from '@/lib/db/player-operations';
import { AccountTypeChoice } from '@/app/schemas/staff';
import { resolveDeclaredAccountType } from '../utils/resolve-declared-account-type';

/**
 * Records what a player tells us about an account TempleOSRS could not settle.
 *
 * A claimed group ironman is verified against the group hiscores first. A
 * group we cannot find is reported back rather than stored as unranked — the
 * player has to make that call themselves, since a typo and an unranked group
 * are indistinguishable from here.
 */
export async function setAccountTypeAction(
  playerName: string,
  choice: AccountTypeChoice,
  groupName?: string,
) {
  try {
    const resolved = await resolveDeclaredAccountType(
      playerName,
      choice,
      groupName,
    );

    if (resolved.status === 'group-not-found') {
      return { success: true as const, status: 'group-not-found' as const };
    }

    const { accountType, gimGroupName } = resolved;

    await updatePlayerAccountType(playerName, accountType, gimGroupName);

    return { success: true as const, status: 'saved' as const, accountType };
  } catch (error) {
    console.error(`Failed to set account type for ${playerName}:`, error);

    return { success: false as const, error: String(error) };
  }
}
