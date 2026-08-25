'use server';

import { z } from 'zod';
import { authActionClient } from '@/app/safe-action';
import { PlayerName } from '@/app/schemas/player';
import { getWikiSyncData } from '@/app/player/data-sources/fetch-player-details/get-wikisync-data';
import { calculateCombatAchievementTier } from '@/app/player/data-sources/fetch-player-details/utils/calculate-combat-achievement-tier';
import type { AchievementScan } from '../scan-types';

/**
 * The combat-achievement side, which only RuneLite's WikiSync plugin can
 * answer.
 *
 * Blood Torva and Dizana's Quiver are not items anything logs — they are
 * unlocked by specific combat achievements, so the achievement ids *are* the
 * evidence. The ids are the same ones `fetchPlayerDetails` uses, and are
 * repeated rather than shared because that function needs a player record to
 * run and this runs before one exists.
 */

/** The four Sleeper/Whispered achievements that unlock the ornament kit. */
const bloodTorvaAchievementIds = [490, 499, 508, 517];

/** Sportsmanship — the Colosseum achievement that unlocks the quiver. */
const dizanasQuiverAchievementId = 538;

export const scanAchievementsAction = authActionClient
  .metadata({ actionName: 'join-scan-achievements' })
  .schema(z.object({ playerName: PlayerName }))
  .action(async ({ parsedInput: { playerName } }): Promise<AchievementScan> => {
    const wikiSyncData = await getWikiSyncData(playerName);

    if (!wikiSyncData) {
      return {
        hasWikiSync: false,
        hasBlorva: false,
        hasQuiver: false,
        hasZukHelm: false,
        combatAchievementTier: null,
      };
    }

    const achieved = new Set(wikiSyncData.combat_achievements);
    const combatAchievementTier = await calculateCombatAchievementTier(
      wikiSyncData.combat_achievements,
    );

    return {
      hasWikiSync: true,
      hasBlorva: new Set(bloodTorvaAchievementIds).isSubsetOf(achieved),
      hasQuiver: achieved.has(dizanasQuiverAchievementId),
      hasZukHelm: combatAchievementTier === 'Grandmaster',
      combatAchievementTier,
    };
  });
