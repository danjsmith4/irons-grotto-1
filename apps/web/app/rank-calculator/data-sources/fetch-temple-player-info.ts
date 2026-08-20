'use server';

import { clientConstants } from '@/config/constants.client';
import { TempleOSRSPlayerInfo } from '@/app/schemas/temple-api';
import * as Sentry from '@sentry/nextjs';

/**
 * A player's game mode, without the rest of their stats.
 *
 * `player_stats.php` carries the same `info` block, but also every skill, boss
 * and clue count — needless weight when resolving an account type, especially
 * once per player across a whole batch run.
 */
export async function fetchTemplePlayerInfo(player: string) {
  try {
    const response = await fetch(
      `${clientConstants.temple.baseUrl}/api/player_info.php?player=${encodeURIComponent(player)}`,
    );

    return TempleOSRSPlayerInfo.parse(await response.json()).data;
  } catch {
    // Unknown players come back as an error body rather than a 404, so a parse
    // failure is the normal "Temple has never seen them" path.
    Sentry.captureMessage('TempleOSRS player info not found', 'info');

    return null;
  }
}
