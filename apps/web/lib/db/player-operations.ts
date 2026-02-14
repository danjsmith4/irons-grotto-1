import { eq, and, sql } from 'drizzle-orm';
import { db } from './index';
import {
  players,
  playerAcquiredItems,
  playerAchievementDiaries,
  type Player,
  type NewPlayer,
  type PlayerAcquiredItem,
  type NewPlayerAcquiredItem,
  type PlayerAchievementDiary,
} from './schema';
import { getCategoryFromItemName } from './item-mapping-utils';
import type { PlayerDetailsResponse } from '@/app/rank-calculator/data-sources/fetch-player-details/fetch-player-details';
import { TempleOSRSCollectionLogItem } from '@/app/schemas/temple-api';

// Player Operations
export interface CreatePlayerData {
  playerName: string;
  joinDate: string; // ISO date string
  rank: string;
  ehb?: number;
  ehp?: number;
  combatAchievementTier?: string;
  proofLink?: string;
  collectionLogCount?: number;
  collectionLogTotal?: number;
  totalLevel?: number;
  clueCountBeginner?: number;
  clueCountEasy?: number;
  clueCountMedium?: number;
  clueCountHard?: number;
  clueCountElite?: number;
  clueCountMaster?: number;
  tzhaarCape?: string;
  hasBloodTorva?: boolean;
  hasRadiantOathplate?: boolean;
  hasDizanasQuiver?: boolean;
  hasAchievementDiaryCape?: boolean;
  combatBonusPoints?: number;
  skillingBonusPoints?: number;
  collectionLogBonusPoints?: number;
  notableItemsBonusPoints?: number;
}

export interface UpdatePlayerData {
  ehb?: number;
  ehp?: number;
  combatAchievementTier?: string;
  rank?: string;
  proofLink?: string;
  collectionLogCount?: number;
  collectionLogTotal?: number;
  totalLevel?: number;
  clueCountBeginner?: number;
  clueCountEasy?: number;
  clueCountMedium?: number;
  clueCountHard?: number;
  clueCountElite?: number;
  clueCountMaster?: number;
  tzhaarCape?: string;
  hasBloodTorva?: boolean;
  hasRadiantOathplate?: boolean;
  hasDizanasQuiver?: boolean;
  hasAchievementDiaryCape?: boolean;
  combatBonusPoints?: number;
  skillingBonusPoints?: number;
  collectionLogBonusPoints?: number;
  notableItemsBonusPoints?: number;
}

/**
 * Creates a new player record
 */
export async function createNewPlayer(data: CreatePlayerData): Promise<Player> {
  const playerData: NewPlayer = {
    ...data,
    joinDate: data.joinDate,
    updatedAt: new Date(),
  };

  const [createdPlayer] = await db
    .insert(players)
    .values(playerData)
    .returning();
  return createdPlayer;
}

/**
 * Updates an existing player's data (excludes playerName and joinDate)
 */
export async function updatePlayer(
  playerName: string,
  data: UpdatePlayerData,
): Promise<Player | null> {
  const [updatedPlayer] = await db
    .update(players)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(players.playerName, playerName))
    .returning();

  return updatedPlayer || null;
}

/**
 * Creates or updates a player record - ideal for database integration
 * This handles membership checking internally
 */
export async function createOrUpdatePlayer(
  data: CreatePlayerData,
): Promise<Player> {
  // Check if player already exists
  const [existingPlayer] = await db
    .select()
    .from(players)
    .where(eq(players.playerName, data.playerName))
    .limit(1);

  if (existingPlayer) {
    // Player exists - update with new data
    const { playerName, joinDate, ...updateData } = data;
    const updated = await updatePlayer(playerName, updateData);
    return updated!;
  } else {
    // Player doesn't exist - create new record
    return await createNewPlayer(data);
  }
}

// Acquired Items Operations
export interface AddItemData {
  playerName: string;
  itemName: string;
  itemId: number;
  count: number;
  itemCategory: string;
  dateFirstLogged: string; // ISO date string
}

export interface BulkItemUpdate {
  playerName: string;
  itemUpdates: {
    itemId: number;
    count: number;
  }[];
}

/**
 * Adds a new acquired item for a player
 */
export async function addNewItem(
  data: AddItemData,
): Promise<PlayerAcquiredItem> {
  const itemData: NewPlayerAcquiredItem = {
    ...data,
    dateFirstLogged: new Date(data.dateFirstLogged),
  };

  const [createdItem] = await db
    .insert(playerAcquiredItems)
    .values(itemData)
    .returning();
  return createdItem;
}

/**
 * Bulk update item counts for a player
 */
export async function bulkUpdateItemCounts(
  updates: BulkItemUpdate[],
): Promise<void> {
  for (const update of updates) {
    for (const itemUpdate of update.itemUpdates) {
      await db
        .update(playerAcquiredItems)
        .set({ count: itemUpdate.count })
        .where(
          and(
            eq(playerAcquiredItems.playerName, update.playerName),
            eq(playerAcquiredItems.itemId, itemUpdate.itemId),
          ),
        );
    }
  }
}

export async function bulkUpsertCollectionLogItems(
  playerName: string,
  items: TempleOSRSCollectionLogItem[],
): Promise<void> {
  if (items.length === 0) return;

  // Filter to only acquired items and map to our database format
  const filteredItems = items
    .filter((item) => item.count > 0)
    .map((item) => ({
      playerName,
      itemName: item.name,
      itemId: item.id,
      count: item.count,
      itemCategory: getCategoryFromItemName(item.name),
      dateFirstLogged: item.date,
    }));

  if (filteredItems.length === 0) return;

  // Deduplicate items by itemId, summing counts for duplicates
  const itemMap = new Map<number, (typeof filteredItems)[0]>();

  filteredItems.forEach((item) => {
    const existing = itemMap.get(item.itemId);
    if (existing) {
      // Sum the counts and keep the earlier date
      itemMap.set(item.itemId, {
        ...existing,
        count: existing.count + item.count,
        dateFirstLogged:
          existing.dateFirstLogged < item.dateFirstLogged
            ? existing.dateFirstLogged
            : item.dateFirstLogged,
      });
    } else {
      itemMap.set(item.itemId, item);
    }
  });

  const itemsToUpsert = Array.from(itemMap.values());

  // Bulk upsert all items in a single query
  const res = await db
    .insert(playerAcquiredItems)
    .values(itemsToUpsert)
    .onConflictDoUpdate({
      target: [playerAcquiredItems.playerName, playerAcquiredItems.itemId],
      set: {
        count: sql`excluded.count`,
      },
    });
  console.log(res);
}

/**
 * Create or update an acquired item - handles checking if item exists
 */
export async function createOrUpdateAcquiredItem(
  data: AddItemData,
): Promise<PlayerAcquiredItem> {
  // Check if the item already exists for this player
  const [existingItem] = await db
    .select()
    .from(playerAcquiredItems)
    .where(
      and(
        eq(playerAcquiredItems.playerName, data.playerName),
        eq(playerAcquiredItems.itemId, data.itemId),
      ),
    )
    .limit(1);

  if (existingItem) {
    // Update existing item count
    const [updatedItem] = await db
      .update(playerAcquiredItems)
      .set({ count: data.count })
      .where(
        and(
          eq(playerAcquiredItems.playerName, data.playerName),
          eq(playerAcquiredItems.itemId, data.itemId),
        ),
      )
      .returning();
    return updatedItem;
  } else {
    // Create new item record
    return await addNewItem(data);
  }
}

// Achievement Diary Operations
export interface AddAchievementDiaryData {
  playerName: string;
  location: string;
  tier: string;
  completed: boolean;
}

export interface UpdateAchievementDiaryData {
  tier?: string;
  completed?: boolean;
}

/**
 * Adds a new achievement diary record for a player
 */
export async function addAchievementDiary(
  data: AddAchievementDiaryData,
): Promise<PlayerAchievementDiary> {
  const [createdDiary] = await db
    .insert(playerAchievementDiaries)
    .values(data)
    .returning();
  return createdDiary;
}

/**
 * Updates an achievement diary level/completion status
 */
export async function updateAchievementDiaryLevel(
  playerName: string,
  location: string,
  data: UpdateAchievementDiaryData,
): Promise<PlayerAchievementDiary | null> {
  const [updatedDiary] = await db
    .update(playerAchievementDiaries)
    .set({ ...data, updatedAt: new Date() })
    .where(
      and(
        eq(playerAchievementDiaries.playerName, playerName),
        eq(playerAchievementDiaries.location, location),
      ),
    )
    .returning();

  return updatedDiary || null;
}

/**
 * Create or update an achievement diary - handles checking if diary exists
 */
export async function createOrUpdateAchievementDiary(
  data: AddAchievementDiaryData,
): Promise<PlayerAchievementDiary> {
  // Check if the diary record already exists
  const [existingDiary] = await db
    .select()
    .from(playerAchievementDiaries)
    .where(
      and(
        eq(playerAchievementDiaries.playerName, data.playerName),
        eq(playerAchievementDiaries.location, data.location),
      ),
    )
    .limit(1);

  if (existingDiary) {
    // Update existing diary
    const updated = await updateAchievementDiaryLevel(
      data.playerName,
      data.location,
      {
        tier: data.tier,
        completed: data.completed,
      },
    );
    return updated!;
  } else {
    // Create new diary record
    return await addAchievementDiary(data);
  }
}

// Utility function for getting player with relations
export async function getPlayerWithRelations(
  playerName: string,
): Promise<
  | (Player & {
      acquiredItems: PlayerAcquiredItem[];
      achievementDiaries: PlayerAchievementDiary[];
    })
  | null
> {
  const player = await db.query.players.findFirst({
    where: eq(players.playerName, playerName),
    with: {
      acquiredItems: true,
      achievementDiaries: true,
    },
  });

  return player ?? null;
}

/**
 * Database integration function - processes rank calculator data into postgres database
 * This is the main function to call from rank calculator endpoints
 */
export async function syncPlayerToDatabase(
  playerData: PlayerDetailsResponse & {
    rank?: string;
    proofLink?: string;
  },
): Promise<void> {
  try {
    const {
      playerName,
      joinDate,
      rank,
      ehb,
      ehp,
      combatAchievementTier,
      proofLink,
      collectionLogCount,
      collectionLogTotal,
      totalLevel,
      tzhaarCape,
      hasBloodTorva,
      hasRadiantOathplate,
      hasDizanasQuiver,
      hasAchievementDiaryCape,
      combatBonusPoints,
      skillingBonusPoints,
      collectionLogBonusPoints,
      notableItemsBonusPoints,
      clueScrollCounts,
      achievementDiaries,
    } = playerData;

    // Create or update the main player record
    const postgresPlayerData: CreatePlayerData = {
      playerName,
      joinDate:
        joinDate instanceof Date
          ? joinDate.toISOString().split('T')[0]
          : joinDate,
      rank: rank ?? playerData.currentRank ?? 'Unranked', // Default rank when not provided (e.g., during player fetch)
      ehb: ehb ?? 0,
      ehp: ehp ?? 0,
      combatAchievementTier: combatAchievementTier ?? 'None',
      proofLink: proofLink, // Optional field for proof submissions
      collectionLogCount: collectionLogCount ?? 0,
      collectionLogTotal: collectionLogTotal ?? 0,
      totalLevel: totalLevel ?? 32,
      clueCountBeginner: clueScrollCounts?.Beginner ?? 0,
      clueCountEasy: clueScrollCounts?.Easy ?? 0,
      clueCountMedium: clueScrollCounts?.Medium ?? 0,
      clueCountHard: clueScrollCounts?.Hard ?? 0,
      clueCountElite: clueScrollCounts?.Elite ?? 0,
      clueCountMaster: clueScrollCounts?.Master ?? 0,
      tzhaarCape: tzhaarCape ?? 'None',
      hasBloodTorva: hasBloodTorva ?? false,
      hasRadiantOathplate: hasRadiantOathplate ?? false,
      hasDizanasQuiver: hasDizanasQuiver ?? false,
      hasAchievementDiaryCape: hasAchievementDiaryCape ?? false,
      combatBonusPoints: combatBonusPoints ?? 0,
      skillingBonusPoints: skillingBonusPoints ?? 0,
      collectionLogBonusPoints: collectionLogBonusPoints ?? 0,
      notableItemsBonusPoints: notableItemsBonusPoints ?? 0,
    };

    await createOrUpdatePlayer(postgresPlayerData);

    // Sync achievement diaries if they exist
    if (achievementDiaries && typeof achievementDiaries === 'object') {
      for (const [location, tier] of Object.entries(achievementDiaries)) {
        if (tier !== 'None') {
          await createOrUpdateAchievementDiary({
            playerName,
            location,
            tier: tier as string,
            completed: true,
          });
        }
      }
    }

    console.log(
      `Successfully synced player ${playerName} to postgres database`,
    );
  } catch (error) {
    console.error(`Failed to sync player to postgres database:`, error);
    // Don't throw - we don't want to break the main rank calculator flow
  }
}
