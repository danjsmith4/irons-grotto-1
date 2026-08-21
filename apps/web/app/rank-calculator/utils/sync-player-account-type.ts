import { AccountType } from '@/app/schemas/staff';
import { updatePlayerAccountType } from '@/lib/db/player-operations';
import { ensureTrackedOnTemple } from '../data-sources/ensure-tracked-on-temple';
import { resolveAccountType } from './resolve-account-type';

export type AccountTypeSyncOutcome =
  /** Resolved and written. */
  | 'updated'
  /** Resolved, and already what we had stored. */
  | 'unchanged'
  /** Nothing could settle it, and the player has not told us either. */
  | 'unresolved'
  /** Nothing could settle it, but the player already answered. */
  | 'answered'
  | 'failed';

export interface AccountTypeSyncResult {
  outcome: AccountTypeSyncOutcome;
  accountType: AccountType | null;
}

/**
 * Resolves one player's game mode and stores it.
 *
 * Only ever *fills in* a type — a Temple reading of "main" is ambiguous (it
 * reports group ironmen it has not been told about identically), so it never
 * overwrites an answer the player has already given, and never writes `main`
 * on anyone's say-so. Players it cannot settle are reported as `unresolved`,
 * which is precisely the set that will be prompted.
 *
 * Registers untracked members on Temple as it goes. A member Temple has never
 * seen has no stats to be scored on either, so the batch run is the right
 * place to fix that once, rather than leaving it until they next open the
 * calculator.
 */
export async function syncPlayerAccountType(
  playerName: string,
  storedAccountType: AccountType | null,
): Promise<AccountTypeSyncResult> {
  try {
    const { info } = await ensureTrackedOnTemple(playerName);
    const resolution = await resolveAccountType(playerName, info);

    const accountType =
      resolution.status === 'resolved' ? resolution.accountType : null;

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
