'use server';

import { z } from 'zod';
import { authActionClient } from '@/app/safe-action';
import { PlayerName } from '@/app/schemas/player';
import { maximumTotalLevel } from '@/app/schemas/osrs';
import { ensureTrackedOnTemple } from '@/app/player/data-sources/ensure-tracked-on-temple';
import { fetchTemplePlayerStats } from '@/app/player/data-sources/fetch-temple-player-stats';
import { calculateEfficiencyData } from '@/app/player/data-sources/fetch-player-details/utils/calculate-efficiency-data';
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
     * ⚠️ **Via `Primary_ehb` / `Primary_ehp`, never `Im_ehb` / `Im_ehp`
     * directly.**
     *
     * Temple computes one rate per account — the one matching the `Game mode`
     * it has recorded — and leaves the others at a literal `0`. Reading `Im_*`
     * unconditionally therefore reports **zero hours for every group ironman
     * and every main**, because Temple files a GIM under `Game mode 0` (it
     * appears on no individual ironman board — the same ambiguity that makes
     * `resolveAccountType` refuse to infer a main). Verified against
     * `EclipseGoon`, a GIM: `Ehb 99.58 / Im_ehb 0`.
     *
     * Following the pointer also keeps this honest in the other direction: for
     * an account Temple *does* know is an ironman, `Primary_ehb` **is**
     * `Im_ehb`, so ironman figures are shown wherever ironman figures exist.
     * And it is the same value `calculateEfficiencyData` stores on the player
     * record, which is what `calculateEhbPoints` scores from — so the number
     * here is the number their rank is actually computed from.
     */
    const { ehb, ehp } = calculateEfficiencyData(stats);
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
      ehb,
      ehp,
      hiscoresClogSlots: stats?.Collections ?? null,
    };
  });
