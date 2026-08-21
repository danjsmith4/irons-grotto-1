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
  /**
   * Whether this was the player's first pass, in which case the rows written
   * are marked as backfill and kept out of the feed.
   */
  backfilled: boolean;
}

/**
 * Brings a player's accomplishments up to date.
 *
 * Safe to call as often as you like: detection is stateless and every row is
 * inserted `on conflict do nothing`, so this is a no-op once a player has
 * stopped achieving things. It reads the player's stored record rather than any
 * live API, so it belongs *after* whatever refreshed that record.
 *
 * The first pass over a player is recorded as backfill. Members join with a
 * whole account behind them and the detector reports everything it can see, so
 * without this the feed's first render would be a decade of other people's
 * history — see `players.accomplishments_backfilled_at`.
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
      accomplishmentsBackfilledAt: players.accomplishmentsBackfilledAt,
    })
    .from(players)
    .where(eq(players.playerName, playerName))
    .limit(1);

  if (!player) {
    return { detected: 0, recorded: 0, backfilled: false };
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

  const isBackfill = player.accomplishmentsBackfilledAt === null;
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
                iconItemName: accomplishment.iconItemName,
                isBackfilled: isBackfill,
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

    if (isBackfill) {
      // Set unconditionally, including for a player who qualified for nothing —
      // otherwise a brand new account would stay in backfill mode forever and
      // its first real accomplishment would be silently swallowed.
      await tx
        .update(players)
        .set({ accomplishmentsBackfilledAt: now })
        .where(eq(players.playerName, playerName));
    }

    return inserted.length;
  });

  if (recorded > 0) {
    console.log(
      `Recorded ${recorded} ${isBackfill ? 'backfilled ' : ''}accomplishment(s) for ${playerName}`,
    );
  }

  return { detected: detected.length, recorded, backfilled: isBackfill };
}
