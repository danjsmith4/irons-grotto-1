'use server';

import * as Sentry from '@sentry/nextjs';
import { clientConstants } from '@/config/constants.client';
import { updatePlayerAccountType } from '@/lib/db/player-operations';
import { resolveTempleAccountType } from '@/app/schemas/temple-api';
import { fetchTemplePlayerInfo } from '../data-sources/fetch-temple-player-info';

/**
 * Registers a player on TempleOSRS and asks it again.
 *
 * Offered to group ironmen whose group we could not find on the hiscores.
 * Temple tracks group membership separately from the group hiscores, but only
 * for accounts it knows about — so getting the account onto Temple is the one
 * thing that can turn an unresolvable player into a resolvable one without
 * them having to vouch for themselves.
 */
export async function registerOnTempleAction(playerName: string) {
  try {
    await fetch(
      `${clientConstants.temple.baseUrl}/php/add_datapoint.php?player=${encodeURIComponent(playerName)}`,
    );

    const info = await fetchTemplePlayerInfo(playerName);
    const accountType = info
      ? resolveTempleAccountType(info['Game mode'], info.GIM)
      : null;

    if (!accountType) {
      return { success: true as const, accountType: null };
    }

    await updatePlayerAccountType(playerName, accountType);

    return { success: true as const, accountType };
  } catch (error) {
    Sentry.captureException(error);

    return { success: false as const, error: String(error) };
  }
}
