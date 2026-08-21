import { and, eq, inArray, or } from 'drizzle-orm';
import {
  detectAccomplishments,
  eliteDiaryLocationsFrom,
} from '@/app/utils/detect-accomplishments';
import { AllPetItemIds } from '@/app/schemas/osrs';
import { cursedPhalanxItemName } from '@/config/accomplishments';
import { db } from './index';
import {
  playerAccomplishments,
  playerAchievementDiaries,
  playerAcquiredItems,
  players,
} from './schema';

export interface SyncPlayerAccomplishmentsResult {
  /** How many accomplishments the player currently qualifies for. */
  detected: number;
  /** How many of those were new, and so written. */
  recorded: number;
}

/**
 * Brings a player's accomplishments up to date.
 *
 * Safe to call as often as you like: detection is stateless and every row is
 * inserted `on conflict do nothing`, so this is a no-op once a player has
 * stopped achieving things. It reads the player's stored record rather than any
 * live API, so it belongs *after* whatever refreshed that record.
 *
 * A player's first pass finds everything they already qualify for at once, and
 * that is fine: those are real accomplishments and the feed shows them. What
 * stops one member's first sync filling the whole feed is the per-sync cap in
 * `fetchRecentAccomplishments`, which is the same rule the collection-log rail
 * already uses.
 */
export async function syncPlayerAccomplishments(
  playerName: string,
): Promise<SyncPlayerAccomplishmentsResult> {
  const [player] = await db
    .select({
      playerName: players.playerName,
      collectionLogCount: players.collectionLogCount,
      totalLevel: players.totalLevel,
      ehb: players.ehb,
      ehp: players.ehp,
      combatAchievementTier: players.combatAchievementTier,
      tzhaarCape: players.tzhaarCape,
      hasBloodTorva: players.hasBloodTorva,
      hasRadiantOathplate: players.hasRadiantOathplate,
      hasDizanasQuiver: players.hasDizanasQuiver,
      hasAchievementDiaryCape: players.hasAchievementDiaryCape,
    })
    .from(players)
    .where(eq(players.playerName, playerName))
    .limit(1);

  if (!player) {
    return { detected: 0, recorded: 0 };
  }

  const [diaries, acquiredItems] = await Promise.all([
    db
      .select({
        location: playerAchievementDiaries.location,
        tier: playerAchievementDiaries.tier,
        completed: playerAchievementDiaries.completed,
      })
      .from(playerAchievementDiaries)
      .where(eq(playerAchievementDiaries.playerName, playerName)),
    // Only the two item-driven accomplishments — there is no reason to pull a
    // member's entire collection log to find out whether they own a pet.
    db
      .select({
        itemId: playerAcquiredItems.itemId,
        itemName: playerAcquiredItems.itemName,
        dateFirstLogged: playerAcquiredItems.dateFirstLogged,
      })
      .from(playerAcquiredItems)
      .where(
        and(
          eq(playerAcquiredItems.playerName, playerName),
          or(
            inArray(playerAcquiredItems.itemId, AllPetItemIds),
            eq(playerAcquiredItems.itemName, cursedPhalanxItemName),
          ),
        ),
      ),
  ]);

  const detected = detectAccomplishments({
    collectionLogCount: player.collectionLogCount,
    totalLevel: player.totalLevel,
    ehb: player.ehb,
    ehp: player.ehp,
    combatAchievementTier: player.combatAchievementTier,
    tzhaarCape: player.tzhaarCape,
    hasBloodTorva: player.hasBloodTorva,
    hasRadiantOathplate: player.hasRadiantOathplate,
    hasDizanasQuiver: player.hasDizanasQuiver,
    hasAchievementDiaryCape: player.hasAchievementDiaryCape,
    eliteDiaryLocations: eliteDiaryLocationsFrom(diaries),
    acquiredItems,
  });

  const now = new Date();

  const recorded = await db.transaction(async (tx) => {
    const inserted =
      detected.length > 0
        ? await tx
            .insert(playerAccomplishments)
            .values(
              detected.map((accomplishment) => ({
                playerName,
                type: accomplishment.type,
                accomplishmentKey: accomplishment.key,
                label: accomplishment.label,
                value: accomplishment.value,
                // The collection log knows when a drop happened; nothing else
                // does, so the rest are dated from this run.
                achievedAt: accomplishment.achievedAt ?? now,
              })),
            )
            .onConflictDoNothing({
              target: [
                playerAccomplishments.playerName,
                playerAccomplishments.accomplishmentKey,
              ],
            })
            .returning({ id: playerAccomplishments.id })
        : [];

    return inserted.length;
  });

  if (recorded > 0) {
    console.log(`Recorded ${recorded} accomplishment(s) for ${playerName}`);
  }

  return { detected: detected.length, recorded };
}
