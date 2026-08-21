'use server';

import * as Sentry from '@sentry/nextjs';
import { updatePlayerAccountType } from '@/lib/db/player-operations';
import { ensureTrackedOnTemple } from '../data-sources/ensure-tracked-on-temple';
import { resolveAccountType } from '../utils/resolve-account-type';

/**
 * Registers a player on TempleOSRS and asks again.
 *
 * Offered to group ironmen whose group we could not find on the hiscores.
 * Temple tracks group membership separately from the group hiscores, but only
 * for accounts it knows about — so getting the account onto Temple is the one
 * thing that can turn an unresolvable player into a resolvable one without
 * them having to vouch for themselves.
 *
 * Both halves are worth having on their own, which is why they are separate
 * pieces composed here: the account ends up tracked either way, whether or not
 * that settles what game mode it is.
 */
export async function registerOnTempleAction(playerName: string) {
  try {
    const { info } = await ensureTrackedOnTemple(playerName);
    const resolution = await resolveAccountType(playerName, info);

    if (resolution.status !== 'resolved') {
      return { success: true as const, accountType: null };
    }

    await updatePlayerAccountType(playerName, resolution.accountType);

    return { success: true as const, accountType: resolution.accountType };
  } catch (error) {
    Sentry.captureException(error);

    return { success: false as const, error: String(error) };
  }
}
