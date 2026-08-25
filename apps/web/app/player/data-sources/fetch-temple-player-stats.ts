'use server';

import { clientConstants } from '@/config/constants.client';
import { TempleOSRSPlayerStats } from '@/app/schemas/temple-api';
import * as Sentry from '@sentry/nextjs';

/**
 * A player's full TempleOSRS record.
 *
 * `bosses` is deliberately not a parameter. `player_stats.php?bosses=0` omits
 * thirteen fields `TempleOSRSPlayerStats` requires — `info.Primary_ehb`, the
 * three EHB totals, `Collections`, `TzKal-Zuk` and every `Clue_*` — so that
 * call can only ever throw, and the catch below turns the throw into a silent
 * null. Callers that only want a game mode want `fetchTemplePlayerInfo`, which
 * is a fraction of the payload anyway.
 */
export async function fetchTemplePlayerStats(player: string) {
  try {
    const playerStatsQueryParams = new URLSearchParams({
      player,
      bosses: '1',
    });
    const playerStatsResponse = await fetch(
      `${clientConstants.temple.baseUrl}/api/player_stats.php?${playerStatsQueryParams}`,
    );

    return TempleOSRSPlayerStats.parse(await playerStatsResponse.json()).data;
  } catch {
    Sentry.captureMessage('TempleOSRS player stats not found', 'info');

    return null;
  }
}
