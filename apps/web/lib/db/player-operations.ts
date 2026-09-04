import { eq, and, asc, lt, sql } from 'drizzle-orm';
import { db } from './index';
import {
  players,
  playerAcquiredItems,
  playerAchievementDiaries,
  playerRankUps,
  playerAccomplishments,
  playerItemOverrides,
  playerDerivedItems,
  type Player,
  type NewPlayer,
  type PlayerAcquiredItem,
  type NewPlayerAcquiredItem,
  type PlayerAchievementDiary,
} from './schema';
import { getCategoryFromItemName } from './item-mapping-utils';
import { scoreStoredPlayer } from '@/app/data-sources/score-players-from-record';
import { upsertItemOverrides } from './item-override-operations';
import { syncPlayerAccomplishments } from './accomplishment-operations';
import type { PlayerDetailsResponse } from '@/app/player/data-sources/fetch-player-details/fetch-player-details';
import { TempleOSRSCollectionLogItem } from '@/app/schemas/temple-api';
import type { AccountType } from '@/app/schemas/staff';

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
 * Finds whoever has already registered a name, if anyone.
 *
 * ⚠️ **Case-insensitive on purpose, because the constraint is.** The unique
 * index is on `lower(player_name)`, so `getPlayerByName` — which compares the
 * name exactly — can report a name as free that the database will then refuse.
 * Signup used to find out that way: the insert failed with a raw `23505` and
 * the member got a generic "a player with this name already exists" after
 * sitting through the whole scan.
 *
 * Returns the owner's Discord id so the caller can tell the two cases apart.
 * "You already have this account" ends with a link to it; "somebody else has
 * it" is a different problem needing a different answer.
 */
export async function findPlayerRegistration(
  playerName: string,
): Promise<{ playerName: string; discordUserId: string } | null> {
  const [player] = await db
    .select({
      playerName: players.playerName,
      discordUserId: players.discordUserId,
    })
    .from(players)
    .where(sql`lower(${players.playerName}) = lower(${playerName})`)
    .limit(1);

  return player ?? null;
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
    await tx
      .delete(playerAccomplishments)
      .where(eq(playerAccomplishments.playerName, playerName));
    await tx
      .delete(playerItemOverrides)
      .where(eq(playerItemOverrides.playerName, playerName));
    await tx
      .delete(playerDerivedItems)
      .where(eq(playerDerivedItems.playerName, playerName));

    // Delete the player record
    await tx.delete(players).where(eq(players.playerName, playerName));
  });
}

// Player Operations
export interface CreatePlayerData {
  playerName: string;
  joinDate: string; // ISO date string
  rank: string;
  discordUserId: string;
  ehb?: number;
  ehp?: number;
  combatAchievementTier?: string;
  proofLink?: string;
  collectionLogCount?: number;
  collectionLogTotal?: number;
  totalLevel?: number;
  totalXp?: number;
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
  isMobileOnly?: boolean;
  /** Null is a value here, not a gap: it means the game mode is unresolved. */
  accountType?: AccountType | null;
  gimGroupName?: string | null;
}

export interface UpdatePlayerData {
  ehb?: number;
  ehp?: number;
  combatAchievementTier?: string;
  rank?: string;
  // Nullable, matching the column: null clears the link, undefined leaves it.
  proofLink?: string | null;
  collectionLogCount?: number;
  collectionLogTotal?: number;
  totalLevel?: number;
  totalXp?: number;
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
  points?: number;
  accountType?: AccountType;
  gimGroupName?: string | null;
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
 * Validates Discord ownership before allowing updates
 */
export async function updatePlayer(
  playerName: string,
  data: Partial<UpdatePlayerData>,
  discordUserId?: string,
): Promise<Player | null> {
  // Validate Discord ownership before proceeding with any updates
  await assertDiscordOwnership(playerName, discordUserId);

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
  discordUserId: string,
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
    totalXp,
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
    totalXp: totalXp ?? 1154,
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
  discordUserId?: string,
): Promise<Player | null> {
  return await updatePlayer(playerName, { points }, discordUserId);
}

/**
 * Records a player's game mode.
 *
 * Written both when TempleOSRS resolves it and when the player answers the
 * prompt — a null `account_type` is what makes the calculator ask, so this is
 * what stops it asking again.
 */
export async function updatePlayerAccountType(
  playerName: string,
  accountType: AccountType,
  gimGroupName: string | null = null,
  discordUserId?: string,
): Promise<Player | null> {
  return await updatePlayer(
    playerName,
    { accountType, gimGroupName },
    discordUserId,
  );
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
    totalXp,
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
  // `undefined` means the caller had nothing to say; `null` and `''` are the
  // player deliberately removing their link. `if (proofLink)` conflated the
  // three and made a proof link impossible to clear once set.
  if (proofLink !== undefined) updateData.proofLink = proofLink;
  if (collectionLogCount !== undefined && collectionLogCount !== null)
    updateData.collectionLogCount = collectionLogCount;
  if (collectionLogTotal !== undefined && collectionLogTotal !== null)
    updateData.collectionLogTotal = collectionLogTotal;
  if (totalLevel !== undefined && totalLevel !== null && totalLevel > 32)
    updateData.totalLevel = totalLevel;
  if (totalXp !== undefined && totalXp !== null && totalXp > 1154)
    updateData.totalXp = totalXp;

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

  // Update player data using the centralized updatePlayer function
  const updatedPlayer = await updatePlayer(
    playerName,
    updateData,
    discordUserId,
  );
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
 * Discord ownership validation is handled by the underlying update functions
 */
export async function processPlayerData(
  playerData: PlayerDetailsResponse & {
    rank?: string;
    proofLink?: string | null;
  },
  discordUserId: string,
): Promise<Player> {
  const { playerName } = playerData;

  // Check if player already exists
  const [existingPlayer] = await db
    .select()
    .from(players)
    .where(eq(players.playerName, playerName))
    .limit(1);

  try {
    let player = existingPlayer
      ? // Player exists - update with new data (ownership validated in updatePlayerWithFullData)
        (await updatePlayerWithFullData(playerData, discordUserId))!
      : // Player doesn't exist - create new record (no ownership validation needed for new players)
        await createPlayerWithFullData(playerData, discordUserId);

    // Points are a function of the record, so they are computed from the
    // record — the one that was just written, not the response it was written
    // from. Those are not the same thing: the response is a live blend that
    // exists for the length of this call, while the record is what every other
    // reader scores. Scoring the response is what let `players.points` and the
    // comparison ledger disagree for 84 of 136 active members.
    //
    // On failure, leave the stored value alone. Scoring needs live wiki drop
    // rates, and a stale total is a cosmetic lag on the leaderboard where a
    // zero would be a visible catastrophe.
    try {
      const { totalPoints } = await scoreStoredPlayer(player);

      player = (await updatePlayerPoints(playerName, totalPoints)) ?? player;
    } catch (error) {
      console.error(
        `Failed to recalculate points for ${playerName}, keeping the stored total:`,
        error,
      );
    }

    // Accomplishments are read back off the record we just wrote, so this has
    // to come last. Never fatal: a member's stats landing is the point of this
    // call, and noticing what they add up to can wait for the next run.
    try {
      await syncPlayerAccomplishments(playerName);
    } catch (error) {
      console.error(`Failed to sync accomplishments for ${playerName}:`, error);
    }

    return player;
  } catch (error) {
    console.error(`Failed to process player data for ${playerName}:`, error);
    throw error; // Re-throw to let calling code handle the error appropriately
  }
}

/**
 * Writes a change the player made to their own sheet.
 *
 * The autosave path. Everything here is a field the player owns outright or
 * claims for themselves — see `PlayerEditableSchema`, which is what constrains
 * the caller. Stats, rank and points are absent by construction: they are
 * derived or come from a data source, and the browser does not get a vote.
 *
 * Partial: only the keys actually supplied are touched. That is what lets two
 * edits in different panels land independently instead of each rewriting the
 * whole record.
 */
export async function updatePlayerEditableFields(
  playerName: string,
  fields: {
    // `pickBy` in the zod transform leaves the value type optional.
    acquiredItems?: Record<string, boolean | undefined>;
    achievementDiaries?: Record<string, string>;
    combatAchievementTier?: string;
    tzhaarCape?: string;
    hasBloodTorva?: boolean;
    hasDizanasQuiver?: boolean;
    hasRadiantOathplate?: boolean;
    hasAchievementDiaryCape?: boolean;
    proofLink?: string | null;
  },
  discordUserId: string,
): Promise<void> {
  await assertDiscordOwnership(playerName, discordUserId);

  const { acquiredItems, achievementDiaries, proofLink, ...scalars } = fields;

  const updateData: Partial<UpdatePlayerData> = { ...scalars };

  // `proofLink` is separated out because null and '' are real values here —
  // the player clearing their link — and must not be mistaken for "unset".
  if (proofLink !== undefined) updateData.proofLink = proofLink;

  if (Object.keys(updateData).length > 0) {
    await updatePlayer(playerName, updateData, discordUserId);
  }

  if (achievementDiaries) {
    await Promise.all(
      Object.entries(achievementDiaries).map(([location, tier]) =>
        createOrUpdateAchievementDiary({
          playerName,
          location,
          tier,
          completed: tier !== 'None',
        }),
      ),
    );
  }

  if (acquiredItems) {
    const answers = Object.fromEntries(
      Object.entries(acquiredItems)
        .filter(([, value]) => value !== undefined)
        .map(([itemName, value]) => [itemName, Boolean(value)]),
    );

    if (Object.keys(answers).length > 0) {
      await upsertItemOverrides(playerName, answers);
    }
  }
}

/**
 * Clears everything the player has asserted for themselves.
 *
 * The claims, and only the claims: the manual flags, the proof link, and every
 * notable-item override. Stats, rank, points, diaries and the stored collection
 * log are left alone — those come from the data sources and would simply be
 * re-derived on the next sync, so wiping them would achieve nothing except a
 * window of wrong numbers.
 *
 * Backs the calculator's "Delete data" action. Not recoverable.
 */
export async function resetPlayerClaims(
  playerName: string,
  discordUserId: string,
): Promise<void> {
  await assertDiscordOwnership(playerName, discordUserId);

  await db.transaction(async (tx) => {
    await tx
      .update(players)
      .set({
        hasBloodTorva: false,
        hasDizanasQuiver: false,
        hasRadiantOathplate: false,
        hasAchievementDiaryCape: false,
        tzhaarCape: 'None',
        combatAchievementTier: 'None',
        proofLink: null,
        updatedAt: new Date(),
      })
      .where(eq(players.playerName, playerName));

    // `player_derived_items` is deliberately left alone. This clears the
    // player's *claims*, and those rows are not a claim — they are what a
    // source last reported, which a re-sync would arrive at again anyway.
    await tx
      .delete(playerItemOverrides)
      .where(eq(playerItemOverrides.playerName, playerName));
  });
}

export interface MemberBelowTotalLevel {
  playerName: string;
  totalLevel: number;
  rank: string;
  accountType: AccountType | null;
}

/**
 * Active members under the clan's minimum total level.
 *
 * These are the grandfathered ones: the gate refuses every new signup below the
 * line, so anyone in the table under it either predates the rule or was
 * admitted while a source was unreachable — and both belong in the same
 * conversation. That is why membership of this set needs no flag to track it.
 *
 * ⚠️ **Not filtered by `rankedMember`.** Almost every clan-wide query here
 * excludes mains, because mains are not on the points ladder. This one is not
 * about the ladder: the minimum applies at the door to everybody, before an
 * account type has even been resolved, so leaving mains out would hide members
 * the rule genuinely covers.
 *
 * Ordered by total level ascending — furthest from the line first, since those
 * are the ones a moderator most needs to look at.
 */
export async function getMembersBelowTotalLevel(
  minimumTotalLevel: number,
): Promise<MemberBelowTotalLevel[]> {
  return db
    .select({
      playerName: players.playerName,
      totalLevel: players.totalLevel,
      rank: players.rank,
      accountType: players.accountType,
    })
    .from(players)
    .where(
      and(eq(players.isActive, true), lt(players.totalLevel, minimumTotalLevel)),
    )
    .orderBy(asc(players.totalLevel));
}
