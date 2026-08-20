'use server';

import { updatePlayerAccountType } from '@/lib/db/player-operations';
import { AccountTypeChoice } from '@/app/schemas/staff';
import { resolveDeclaredAccountType } from '../utils/resolve-declared-account-type';

/**
 * Records what a player tells us about an account TempleOSRS could not settle.
 *
 * A claimed group ironman is verified against the group hiscores first, so the
 * stored type is only ever taken on trust for unranked groups — which are
 * published nowhere, and are ironmen either way.
 */
export async function setAccountTypeAction(
  playerName: string,
  choice: AccountTypeChoice,
  groupName?: string,
) {
  try {
    const { accountType, gimGroupName } = await resolveDeclaredAccountType(
      playerName,
      choice,
      groupName,
    );

    await updatePlayerAccountType(playerName, accountType, gimGroupName);

    return { success: true as const, accountType, gimGroupName };
  } catch (error) {
    console.error(`Failed to set account type for ${playerName}:`, error);

    return { success: false as const, error: String(error) };
  }
}
