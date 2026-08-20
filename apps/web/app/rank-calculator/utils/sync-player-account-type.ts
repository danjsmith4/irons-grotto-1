import { AccountType } from '@/app/schemas/staff';
import { resolveTempleAccountType } from '@/app/schemas/temple-api';
import { updatePlayerAccountType } from '@/lib/db/player-operations';
import { fetchTemplePlayerInfo } from '../data-sources/fetch-temple-player-info';

export type AccountTypeSyncOutcome =
  /** Resolved from Temple and written. */
  | 'updated'
  /** Resolved from Temple, and already what we had stored. */
  | 'unchanged'
  /** Temple could not settle it, and the player has not told us either. */
  | 'unresolved'
  /** Temple could not settle it, but the player already answered. */
  | 'answered'
  | 'failed';

export interface AccountTypeSyncResult {
  outcome: AccountTypeSyncOutcome;
  accountType: AccountType | null;
}

/**
 * Resolves one player's game mode from TempleOSRS and stores it.
 *
 * Only ever *fills in* a type — a Temple reading of "main" is ambiguous (it
 * reports group ironmen it has not been told about identically), so it never
 * overwrites an answer the player has already given, and never writes `main`
 * on Temple's say-so alone. Players it cannot settle are reported as
 * `unresolved`, which is precisely the set that will be prompted.
 */
export async function syncPlayerAccountType(
  playerName: string,
  storedAccountType: AccountType | null,
): Promise<AccountTypeSyncResult> {
  try {
    const info = await fetchTemplePlayerInfo(playerName);

    const accountType = info
      ? resolveTempleAccountType(info['Game mode'], info.GIM)
      : null;

    if (!accountType) {
      return {
        outcome: storedAccountType ? 'answered' : 'unresolved',
        accountType: storedAccountType,
      };
    }

    if (accountType === storedAccountType) {
      return { outcome: 'unchanged', accountType };
    }

    await updatePlayerAccountType(playerName, accountType);

    return { outcome: 'updated', accountType };
  } catch (error) {
    console.error(`Failed to sync account type for ${playerName}:`, error);

    return { outcome: 'failed', accountType: storedAccountType };
  }
}
