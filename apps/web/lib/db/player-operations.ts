import { eq, and, sql } from 'drizzle-orm';
import { db } from './index';
import {
  players,
  playerAcquiredItems,
  playerAchievementDiaries,
  playerRankUps,
  type Player,
  type NewPlayer,
  type PlayerAcquiredItem,
  type NewPlayerAcquiredItem,
  type PlayerAchievementDiary,
} from './schema';
import { getCategoryFromItemName } from './item-mapping-utils';
import type { PlayerDetailsResponse } from '@/app/rank-calculator/data-sources/fetch-player-details/fetch-player-details';
import { TempleOSRSCollectionLogItem } from '@/app/schemas/temple-api';

/**
 * Validates that the user performing the action matches the discord ID associated with the player
 * @param playerName - The player's name
 * @param userDiscordId - The discord ID of the user performing the action
 * @returns True if validation passes, false if it fails
 */
export async function validateDiscordOwnership(
  playerName: string,
  userDiscordId?: string,
): Promise<boolean> {
  if (!userDiscordId) {
    // If no user discord ID provided, allow the action (for anonymous operations)
    return true;
  }

  const [player] = await db
    .select({ discordUserId: players.discordUserId })
    .from(players)
    .where(eq(players.playerName, playerName))
    .limit(1);

  if (!player) {
    // Player doesn't exist yet, allow creation
    return true;
  }

  if (!player.discordUserId) {
    // Player exists but has no discord ID assigned, allow the action
    return true;
  }

  // Player has a discord ID, must match the user's discord ID
  return player.discordUserId === userDiscordId;
}

/**
 * Validates Discord ownership and throws an error if validation fails
 * Use this for actions that should fail fast if user doesn't have permission
 */
export async function assertDiscordOwnership(
  playerName: string,
  userDiscordId?: string,
): Promise<void> {
  const hasOwnership = await validateDiscordOwnership(
    playerName,
    userDiscordId,
  );
  if (!hasOwnership) {
    throw new Error(
      `You are not authorized to modify player "${playerName}". This player is associated with a different Discord account.`,
    );
  }
}

/**
 * Gets all players associated with a specific Discord user ID
 * @param discordUserId - The Discord user ID to search for
 * @returns Array of players associated with the Discord user
 */
export async function getPlayersByDiscordId(
  discordUserId: string,
): Promise<Player[]> {
  return await db
    .select()
    .from(players)
    .where(eq(players.discordUserId, discordUserId));
}

/**
 * Gets a single player by name (optionally filtered by discord user ID)
 * @param playerName - The player name to search for
 * @param discordUserId - Optional Discord user ID to verify ownership
 * @returns Player record if found, null otherwise
 */
export async function getPlayerByName(
  playerName: string,
  discordUserId?: string,
): Promise<Player | null> {
  const conditions = [eq(players.playerName, playerName)];

  if (discordUserId) {
    conditions.push(eq(players.discordUserId, discordUserId));
  }

  const [player] = await db
    .select()
    .from(players)
    .where(and(...conditions))
    .limit(1);

  return player || null;
}

/**
 * Deletes a player record (with ownership validation)
 * @param playerName - The player name to delete
 * @param discordUserId - The Discord user ID to verify ownership
 */
export async function deletePlayer(
  playerName: string,
  discordUserId: string,
): Promise<void> {
  // Validate ownership first
  await assertDiscordOwnership(playerName, discordUserId);

  // Delete the player and all related records
  await db.transaction(async (tx) => {
    // Delete related records first (foreign key constraints)
    await tx
      .delete(playerAcquiredItems)
      .where(eq(playerAcquiredItems.playerName, playerName));
    await tx
      .delete(playerAchievementDiaries)
      .where(eq(playerAchievementDiaries.playerName, playerName));
    await tx
      .delete(playerRankUps)
      .where(eq(playerRankUps.playerName, playerName));

    // Delete the player record
    await tx.delete(players).where(eq(players.playerName, playerName));
  });
}

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
  discordUserId?: string;
  isMobileOnly?: boolean;
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
  discordUserId?: string;
  isMobileOnly?: boolean;
  updatedAt?: Date;
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
 * Updates an existing player's data with only the provided fields
 * Only updates fields that are explicitly provided in the data object
 */
export async function updatePlayer(
  playerName: string,
  data: Partial<UpdatePlayerData>,
): Promise<Player | null> {
  // Only update if we have data to update
  if (Object.keys(data).length === 0) {
    const [existingPlayer] = await db
      .select()
      .from(players)
      .where(eq(players.playerName, playerName))
      .limit(1);
    return existingPlayer || null;
  }

  const [updatedPlayer] = await db
    .update(players)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(players.playerName, playerName))
    .returning();

  return updatedPlayer || null;
}

/**
 * Creates a new player with all related data (acquired items and achievement diaries)
 * Use this for creating brand new players from rank calculator data
 */
export async function createPlayerWithFullData(
  playerData: PlayerDetailsResponse & {
    rank?: string;
    proofLink?: string | null;
  },
  discordUserId?: string,
): Promise<Player> {
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
    rawCollectionLogItems,
  } = playerData;

  // Create new player with proper defaults
  const createData: CreatePlayerData = {
    playerName,
    joinDate:
      joinDate instanceof Date
        ? joinDate.toISOString().split('T')[0]
        : joinDate,
    rank: rank ?? 'Unranked',
    ehb: ehb ?? 0,
    ehp: ehp ?? 0,
    combatAchievementTier: combatAchievementTier ?? 'None',
    proofLink: proofLink ?? undefined,
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
    discordUserId,
  };

  const createdPlayer = await createNewPlayer(createData);

  // Create achievement diaries if they exist
  if (achievementDiaries && typeof achievementDiaries === 'object') {
    for (const [location, tier] of Object.entries(achievementDiaries)) {
      if (tier !== 'None') {
        await addAchievementDiary({
          playerName,
          location,
          tier: tier as string,
          completed: true,
        });
      }
    }
  }

  // Create collection log items if they exist
  if (
    rawCollectionLogItems &&
    Array.isArray(rawCollectionLogItems) &&
    rawCollectionLogItems.length > 0
  ) {
    await bulkUpsertCollectionLogItems(playerName, rawCollectionLogItems);
  }

  console.log(`Successfully created player ${playerName} with full data`);
  return createdPlayer;
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
 * Updates a player's total points
 */
export async function updatePlayerPoints(
  playerName: string,
  points: number,
): Promise<Player | null> {
  const [updatedPlayer] = await db
    .update(players)
    .set({
      points,
      updatedAt: new Date(),
    })
    .where(eq(players.playerName, playerName))
    .returning();

  return updatedPlayer || null;
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
export async function getPlayerWithRelations(playerName: string): Promise<
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
 * Updates an existing player with all related data (acquired items and achievement diaries)
 * Use this for updating existing players from rank calculator data
 * Only updates fields that have meaningful values - does not overwrite good data with defaults
 */
export async function updatePlayerWithFullData(
  playerData: PlayerDetailsResponse & {
    rank?: string;
    proofLink?: string | null;
  },
  discordUserId?: string,
): Promise<Player | null> {
  const {
    playerName,
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
    rawCollectionLogItems,
    rank,
  } = playerData;

  // Build update data with only fields that have meaningful values
  const updateData: Partial<UpdatePlayerData> = {};

  // Only include rank if explicitly provided (don't default)
  if (rank) updateData.rank = rank;

  // Include stats only if they're meaningful (> 0 or explicitly set)
  if (ehb !== undefined && ehb !== null) updateData.ehb = ehb;
  if (ehp !== undefined && ehp !== null) updateData.ehp = ehp;
  if (combatAchievementTier && combatAchievementTier !== 'None')
    updateData.combatAchievementTier = combatAchievementTier;
  if (proofLink) updateData.proofLink = proofLink;
  if (collectionLogCount !== undefined && collectionLogCount !== null)
    updateData.collectionLogCount = collectionLogCount;
  if (collectionLogTotal !== undefined && collectionLogTotal !== null)
    updateData.collectionLogTotal = collectionLogTotal;
  if (totalLevel !== undefined && totalLevel !== null && totalLevel > 32)
    updateData.totalLevel = totalLevel;

  // Include clue counts only if they exist
  if (clueScrollCounts?.Beginner !== undefined)
    updateData.clueCountBeginner = clueScrollCounts.Beginner;
  if (clueScrollCounts?.Easy !== undefined)
    updateData.clueCountEasy = clueScrollCounts.Easy;
  if (clueScrollCounts?.Medium !== undefined)
    updateData.clueCountMedium = clueScrollCounts.Medium;
  if (clueScrollCounts?.Hard !== undefined)
    updateData.clueCountHard = clueScrollCounts.Hard;
  if (clueScrollCounts?.Elite !== undefined)
    updateData.clueCountElite = clueScrollCounts.Elite;
  if (clueScrollCounts?.Master !== undefined)
    updateData.clueCountMaster = clueScrollCounts.Master;

  // Include items only if explicitly provided
  if (tzhaarCape && tzhaarCape !== 'None') updateData.tzhaarCape = tzhaarCape;
  if (hasBloodTorva !== undefined) updateData.hasBloodTorva = hasBloodTorva;
  if (hasRadiantOathplate !== undefined)
    updateData.hasRadiantOathplate = hasRadiantOathplate;
  if (hasDizanasQuiver !== undefined)
    updateData.hasDizanasQuiver = hasDizanasQuiver;
  if (hasAchievementDiaryCape !== undefined)
    updateData.hasAchievementDiaryCape = hasAchievementDiaryCape;

  // Include bonus points only if they're meaningful
  if (combatBonusPoints !== undefined && combatBonusPoints !== null)
    updateData.combatBonusPoints = combatBonusPoints;
  if (skillingBonusPoints !== undefined && skillingBonusPoints !== null)
    updateData.skillingBonusPoints = skillingBonusPoints;
  if (
    collectionLogBonusPoints !== undefined &&
    collectionLogBonusPoints !== null
  )
    updateData.collectionLogBonusPoints = collectionLogBonusPoints;
  if (notableItemsBonusPoints !== undefined && notableItemsBonusPoints !== null)
    updateData.notableItemsBonusPoints = notableItemsBonusPoints;

  // Only set discord ID if player doesn't already have one assigned
  if (discordUserId) {
    const [existingPlayer] = await db
      .select({ discordUserId: players.discordUserId })
      .from(players)
      .where(eq(players.playerName, playerName))
      .limit(1);

    if (existingPlayer && !existingPlayer.discordUserId) {
      updateData.discordUserId = discordUserId;
    }
  }

  // Update player data
  const updatedPlayer = await updatePlayer(playerName, updateData);
  if (!updatedPlayer) {
    console.error(`Player ${playerName} not found for update`);
    return null;
  }

  // Update achievement diaries if they exist
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

  // Update collection log items if they exist
  if (
    rawCollectionLogItems &&
    Array.isArray(rawCollectionLogItems) &&
    rawCollectionLogItems.length > 0
  ) {
    await bulkUpsertCollectionLogItems(playerName, rawCollectionLogItems);
  }

  console.log(`Successfully updated player ${playerName} with full data`);
  return updatedPlayer;
}

/**
 * Main entry point for processing rank calculator data into the database
 * Automatically determines whether to create new player or update existing one
 * Validates Discord ownership before allowing modifications
 */
export async function processPlayerData(
  playerData: PlayerDetailsResponse & {
    rank?: string;
    proofLink?: string | null;
  },
  discordUserId?: string,
): Promise<Player> {
  const { playerName } = playerData;

  // Validate Discord ownership before proceeding
  const hasOwnership = await validateDiscordOwnership(
    playerName,
    discordUserId,
  );
  if (!hasOwnership) {
    throw new Error(
      `Discord user ${discordUserId} is not authorized to modify player ${playerName}. This player is owned by a different Discord account.`,
    );
  }

  // Check if player already exists
  const [existingPlayer] = await db
    .select()
    .from(players)
    .where(eq(players.playerName, playerName))
    .limit(1);

  try {
    if (existingPlayer) {
      // Player exists - update with new data
      const updatedPlayer = await updatePlayerWithFullData(
        playerData,
        discordUserId,
      );
      return updatedPlayer!;
    } else {
      // Player doesn't exist - create new record
      return await createPlayerWithFullData(playerData, discordUserId);
    }
  } catch (error) {
    console.error(`Failed to process player data for ${playerName}:`, error);
    throw error; // Re-throw to let calling code handle the error appropriately
  }
}
