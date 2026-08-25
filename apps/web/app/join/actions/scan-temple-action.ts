'use server';

import { z } from 'zod';
import { authActionClient } from '@/app/safe-action';
import { PlayerName } from '@/app/schemas/player';
import { maximumTotalLevel } from '@/app/schemas/osrs';
import { ensureTrackedOnTemple } from '@/app/player/data-sources/ensure-tracked-on-temple';
import { fetchTemplePlayerStats } from '@/app/player/data-sources/fetch-temple-player-stats';
import { resolveAccountType } from '@/app/player/utils/resolve-account-type';
import type { TempleScan } from '../scan-types';

/**
 * The TempleOSRS step, and the one that does real work rather than only
 * reading: an account Temple has never seen is registered here and re-polled.
 *
 * That is why this step is allowed to take ten seconds and why the experience
 * shows it happening rather than hiding it. "Not on Temple" is never treated
 * as an answer about the player — it means nobody has ever asked Temple to
 * look, and every stat this site scores comes from Temple, so closing that gap
 * is the single most useful thing signup does.
 */
export const scanTempleAction = authActionClient
  .metadata({ actionName: 'join-scan-temple' })
  .schema(z.object({ playerName: PlayerName }))
  .action(async ({ parsedInput: { playerName } }): Promise<TempleScan> => {
    const tracking = await ensureTrackedOnTemple(playerName);
    const resolution = await resolveAccountType(tracking.info);

    // Only worth asking for once Temple has a record to answer from.
    const stats = tracking.isTracked
      ? await fetchTemplePlayerStats(playerName)
      : null;

    /*
     * The ironman rates, read directly rather than through
     * `calculateEfficiencyData` — that follows Temple's `Primary_ehb` /
     * `Primary_ehp` pointers to whichever rate suits the account's own game
     * mode, which is right for the stored record but wrong on this screen.
     * Every other efficiency number on the site is an ironman figure, so a main
     * shown their main-rate hours here would be reading a different unit from
     * the one their rank is scored in.
     */
    const totalLevel = stats?.Overall_level ?? null;

    return {
      isTracked: tracking.isTracked,
      didRegister: tracking.didRegister,
      accountType:
        resolution.status === 'resolved' ? resolution.accountType : null,
      totalLevel,
      isMaxed: totalLevel === maximumTotalLevel,
      // The same rule the calculator uses: a single Zuk kill is the cape.
      hasInfernal: (stats?.['TzKal-Zuk'] ?? 0) > 0,
      ehb: stats?.Im_ehb ?? null,
      ehp: stats?.Im_ehp ?? null,
      hiscoresClogSlots: stats?.Collections ?? null,
    };
  });
