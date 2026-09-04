import { db } from '@/lib/db';
import {
  Player,
  playerAcquiredItems,
  playerAchievementDiaries,
  playerItemOverrides,
} from '@/lib/db/schema';
import { inArray } from 'drizzle-orm';
import { ItemCategoryMap } from '@/app/schemas/items';
import {
  ClueScrollTier,
  CombatAchievementTier,
  DiaryLocation,
  DiaryTier,
  TzHaarCape,
} from '@/app/schemas/osrs';
import { AchievementDiaryMap } from '@/app/schemas/rank-calculator';
import { isItemAcquired } from '@/app/player/data-sources/fetch-player-details/utils/is-item-acquired';
import {
  fetchItemDropRates,
  generateRequiredItemList,
} from '@/app/player/data-sources/fetch-dropped-item-info';
import { buildNotableItemList } from '@/app/player/utils/build-notable-item-list';
import { getDerivedItemsForPlayers } from '@/lib/db/derived-item-operations';
import {
  buildPointsBreakdown,
  PointsBreakdown,
} from '@/app/player/utils/build-points-breakdown';
import {
  calculateRank,
  RankData,
} from '@/app/player/utils/calculators/calculate-rank';
import { stripEntityName } from '@/app/player/utils/strip-entity-name';

/**
 * Scoring a player from what is *stored* about them.
 *
 * This is the single scoring path. It used to be two: the leaderboard's total
 * came from `calculatePlayerPoints(PlayerDetailsResponse)` — the live blend of
 * Temple, WikiSync and the wiki, computed once during a sync and then frozen
 * in `players.points` — while the comparison ledger scored the same player out
 * of the database. Identical arithmetic over different inputs, so the two
 * drifted apart the moment the record moved without a sync behind it, which is
 * most of the time. At the point this was written 84 of 136 active members
 * disagreed with their own breakdown, every one of them scored *low*.
 *
 * Everything the calculation needs is already in Postgres, and reading it
 * costs nothing external, so the record is the source of truth and this is the
 * only thing that turns it into a number. The live fetch's job is to keep the
 * record current; it no longer gets a second opinion on what the record means.
 */

/** Ascending, so the highest completed tier per location wins. */
const diaryTierOrder: DiaryTier[] = ['None', 'Easy', 'Medium', 'Hard', 'Elite'];

export interface StoredPlayerInputs {
  collectionLogCounts: Record<string, number>;
  achievementDiaries: AchievementDiaryMap;
  overrides: Record<string, boolean>;
  derivedItems: Record<string, boolean>;
}

function toAchievementDiaryMap(
  rows: { location: string; tier: string; completed: boolean }[],
): AchievementDiaryMap {
  return rows.reduce<AchievementDiaryMap>((acc, row) => {
    if (!row.completed) {
      return acc;
    }

    const location = DiaryLocation.safeParse(row.location);
    const tier = DiaryTier.safeParse(row.tier);

    if (!location.success || !tier.success) {
      return acc;
    }

    const current = acc[location.data] ?? 'None';

    return diaryTierOrder.indexOf(tier.data) > diaryTierOrder.indexOf(current)
      ? { ...acc, [location.data]: tier.data }
      : acc;
  }, {});
}

/**
 * Which notable items a player holds, according to what has been *stored* for
 * them.
 *
 * Three sources, in increasing order of authority:
 *
 * 1. the collection log (`player_acquired_items`), which settles every notable
 *    item that occupies a log slot;
 * 2. `player_derived_items`, which settles the six that do not — the quest
 *    items, 6 Jads and Music cape, whose only source is a WikiSync read;
 * 3. the player's own overrides, which win over both, exactly as they do in
 *    the calculator.
 */
export function buildStoredAcquiredItems(
  notableItemList: ItemCategoryMap,
  collectionLogCounts: Record<string, number>,
  derivedItems: Record<string, boolean>,
  overrides: Record<string, boolean>,
): Record<string, boolean> {
  return Object.values(notableItemList)
    .flatMap(({ items }) => items)
    .reduce<Record<string, boolean>>((acc, item) => {
      const key = stripEntityName(item.name);
      // `??` rather than `||` throughout: a stored `false` is a real answer and
      // must not fall through to the next source.
      const stored =
        derivedItems[key] ??
        isItemAcquired(item, { acquiredItems: collectionLogCounts });

      return { ...acc, [key]: overrides[key] ?? stored };
    }, {});
}

/**
 * Loads every stored input the scoring needs, for a batch of players at once.
 *
 * Four queries regardless of how many players are asked for, because the batch
 * paths score the whole roster and a per-player round trip would dominate the
 * run.
 */
export async function loadStoredPlayerInputs(
  playerNames: string[],
): Promise<(playerName: string) => StoredPlayerInputs> {
  if (playerNames.length === 0) {
    return () => ({
      collectionLogCounts: {},
      achievementDiaries: {},
      overrides: {},
      derivedItems: {},
    });
  }

  const [items, diaries, overrides, derivedItems] = await Promise.all([
    db
      .select({
        playerName: playerAcquiredItems.playerName,
        itemName: playerAcquiredItems.itemName,
        count: playerAcquiredItems.count,
      })
      .from(playerAcquiredItems)
      .where(inArray(playerAcquiredItems.playerName, playerNames)),
    db
      .select({
        playerName: playerAchievementDiaries.playerName,
        location: playerAchievementDiaries.location,
        tier: playerAchievementDiaries.tier,
        completed: playerAchievementDiaries.completed,
      })
      .from(playerAchievementDiaries)
      .where(inArray(playerAchievementDiaries.playerName, playerNames)),
    db
      .select({
        playerName: playerItemOverrides.playerName,
        itemName: playerItemOverrides.itemName,
        isAcquired: playerItemOverrides.isAcquired,
      })
      .from(playerItemOverrides)
      .where(inArray(playerItemOverrides.playerName, playerNames)),
    getDerivedItemsForPlayers(playerNames),
  ]);

  // Grouped once up front — `filter` per player per table is quadratic, which
  // is invisible for the comparison's two players and very much not for the
  // reconciliation's two hundred.
  const groupBy = <T extends { playerName: string }>(rows: T[]) =>
    rows.reduce<Record<string, T[]>>((acc, row) => {
      const existing = acc[row.playerName];

      if (existing) {
        existing.push(row);
      } else {
        acc[row.playerName] = [row];
      }

      return acc;
    }, {});

  const itemsByPlayer = groupBy(items);
  const diariesByPlayer = groupBy(diaries);
  const overridesByPlayer = groupBy(overrides);

  return (playerName: string) => ({
    collectionLogCounts: (itemsByPlayer[playerName] ?? []).reduce<
      Record<string, number>
    >(
      (acc, { itemName, count }) => ({
        ...acc,
        [stripEntityName(itemName)]: count,
      }),
      {},
    ),
    achievementDiaries: toAchievementDiaryMap(
      diariesByPlayer[playerName] ?? [],
    ),
    overrides: (overridesByPlayer[playerName] ?? []).reduce<
      Record<string, boolean>
    >(
      (acc, { itemName, isAcquired }) => ({ ...acc, [itemName]: isAcquired }),
      {},
    ),
    derivedItems: derivedItems[playerName] ?? {},
  });
}

/**
 * The itemised score for one player, from their stored record.
 *
 * `totalPoints` on the result is what belongs in `players.points`; the lines
 * are the same arithmetic broken out, which is what the comparison ledger
 * renders. One call, so the headline and the ledger cannot disagree.
 */
export function scorePlayerFromRecord(
  player: Player,
  stored: StoredPlayerInputs,
  notableItemList: ItemCategoryMap,
): PointsBreakdown {
  return buildPointsBreakdown(
    {
      joinDate: player.joinDate ? new Date(player.joinDate) : null,
      ehb: player.ehb,
      ehp: player.ehp,
      totalLevel: player.totalLevel,
      combatAchievementTier: CombatAchievementTier.catch('None').parse(
        player.combatAchievementTier,
      ),
      tzhaarCape: TzHaarCape.catch('None').parse(player.tzhaarCape),
      hasBloodTorva: player.hasBloodTorva,
      hasRadiantOathplate: player.hasRadiantOathplate,
      hasDizanasQuiver: player.hasDizanasQuiver,
      hasAchievementDiaryCape: player.hasAchievementDiaryCape,
      collectionLogCount: player.collectionLogCount,
      collectionLogTotal: player.collectionLogTotal,
      clueScrollCounts: {
        Beginner: player.clueCountBeginner,
        Easy: player.clueCountEasy,
        Medium: player.clueCountMedium,
        Hard: player.clueCountHard,
        Elite: player.clueCountElite,
        Master: player.clueCountMaster,
      } satisfies Record<ClueScrollTier, number>,
      achievementDiaries: stored.achievementDiaries,
      acquiredItems: buildStoredAcquiredItems(
        notableItemList,
        stored.collectionLogCounts,
        stored.derivedItems,
        stored.overrides,
      ),
      combatBonusPoints: player.combatBonusPoints,
      skillingBonusPoints: player.skillingBonusPoints,
      collectionLogBonusPoints: player.collectionLogBonusPoints,
      notableItemsBonusPoints: player.notableItemsBonusPoints,
    },
    notableItemList,
  );
}

/**
 * The notable item list, built from live wiki drop rates.
 *
 * Shared by every player in a batch — it is the one genuinely expensive part
 * of scoring and it does not vary per player, so building it once is what
 * makes scoring the whole roster a couple of seconds rather than a couple of
 * minutes. `fetchItemDropRates` is `unstable_cache`d underneath.
 */
export async function buildScoringItemList(): Promise<ItemCategoryMap> {
  const dropRates = await fetchItemDropRates([...generateRequiredItemList()]);

  return buildNotableItemList(dropRates);
}

/**
 * Scores one stored player, building everything it needs itself.
 *
 * The convenience wrapper for the single-player callers (a sync finishing, an
 * auto-rank check). Batch callers should build the item list once and use
 * {@link scorePlayersFromRecords} instead — this would rebuild it per player.
 */
export async function scoreStoredPlayer(player: Player): Promise<{
  totalPoints: number;
  rankData: RankData;
  breakdown: PointsBreakdown;
}> {
  const [notableItemList, storedFor] = await Promise.all([
    buildScoringItemList(),
    loadStoredPlayerInputs([player.playerName]),
  ]);

  const stored = storedFor(player.playerName);
  const breakdown = scorePlayerFromRecord(player, stored, notableItemList);
  const rankData = calculateRank(
    buildStoredAcquiredItems(
      notableItemList,
      stored.collectionLogCounts,
      stored.derivedItems,
      stored.overrides,
    ),
    CombatAchievementTier.catch('None').parse(player.combatAchievementTier),
    breakdown.totalPoints,
    player.accountType,
  );

  return { totalPoints: breakdown.totalPoints, rankData, breakdown };
}

/**
 * Scores a batch of players in one pass.
 *
 * Returns a breakdown per player name, keyed exactly as the records were
 * given. A player whose record is missing is simply absent from the result.
 */
export async function scorePlayersFromRecords(
  records: Player[],
  notableItemList?: ItemCategoryMap,
): Promise<Record<string, PointsBreakdown>> {
  if (records.length === 0) {
    return {};
  }

  const [itemList, storedFor] = await Promise.all([
    notableItemList ? Promise.resolve(notableItemList) : buildScoringItemList(),
    loadStoredPlayerInputs(records.map(({ playerName }) => playerName)),
  ]);

  return records.reduce<Record<string, PointsBreakdown>>(
    (acc, player) => ({
      ...acc,
      [player.playerName]: scorePlayerFromRecord(
        player,
        storedFor(player.playerName),
        itemList,
      ),
    }),
    {},
  );
}
