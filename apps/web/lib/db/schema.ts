import {
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
  integer,
  boolean,
  date,
  real,
  varchar,
  unique,
  uniqueIndex,
  index,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm/sql/sql';
import { relations } from 'drizzle-orm';

// uuid-ossp extension is required for gen_random_uuid()
// Make sure to enable it in your database with: CREATE EXTENSION IF NOT EXISTS "pgcrypto";

/**
 * Staff standing, and the account's game mode. Both are metadata *about* a
 * player rather than a rank they earn — see `app/schemas/staff.ts`, which
 * mirrors these values for the app layer.
 */
export const staffRoleEnum = pgEnum('staff_role', [
  'moderator',
  'admin',
  'deputy_owner',
  'owner',
]);

export const accountTypeEnum = pgEnum('account_type', [
  'main',
  'ironman',
  'hardcore_ironman',
  'ultimate_ironman',
  'group_ironman',
  'hardcore_group_ironman',
  'unranked_group_ironman',
]);

// Players table - main player information
export const players = pgTable(
  'players',
  {
    playerName: varchar('player_name', { length: 12 }).primaryKey(), // OSRS player names are max 12 characters
    joinDate: date('join_date').notNull(),
    ehb: real('ehb').notNull().default(0),
    ehp: real('ehp').notNull().default(0),
    combatAchievementTier: varchar('combat_achievement_tier', { length: 50 })
      .notNull()
      .default('None'),
    rank: varchar('rank', { length: 50 }).notNull(),
    proofLink: text('proof_link'),
    collectionLogCount: integer('collection_log_count').notNull().default(0),
    collectionLogTotal: integer('collection_log_total').notNull().default(0),
    totalLevel: integer('total_level').notNull().default(32), // Minimum total level (level 1 in all skills)
    totalXp: integer('total_xp').notNull().default(1154), // Minimum total XP (200 XP in each skill, + 1154 in hitpoints)

    // Clue scroll counts - individual columns as requested
    clueCountBeginner: integer('clue_count_beginner').notNull().default(0),
    clueCountEasy: integer('clue_count_easy').notNull().default(0),
    clueCountMedium: integer('clue_count_medium').notNull().default(0),
    clueCountHard: integer('clue_count_hard').notNull().default(0),
    clueCountElite: integer('clue_count_elite').notNull().default(0),
    clueCountMaster: integer('clue_count_master').notNull().default(0),

    // High level player items/achievements
    tzhaarCape: varchar('tzhaar_cape', { length: 50 })
      .notNull()
      .default('None'),
    hasBloodTorva: boolean('has_blood_torva').notNull().default(false),
    hasRadiantOathplate: boolean('has_radiant_oathplate')
      .notNull()
      .default(false),
    hasDizanasQuiver: boolean('has_dizanas_quiver').notNull().default(false),
    hasAchievementDiaryCape: boolean('has_achievement_diary_cape')
      .notNull()
      .default(false),

    // Bonus points
    combatBonusPoints: real('combat_bonus_points').notNull().default(0),
    skillingBonusPoints: real('skilling_bonus_points').notNull().default(0),
    collectionLogBonusPoints: real('collection_log_bonus_points')
      .notNull()
      .default(0),
    notableItemsBonusPoints: real('notable_items_bonus_points')
      .notNull()
      .default(0),

    // Total calculated points
    points: real('points').notNull().default(0),

    // Discord integration
    discordUserId: varchar('discord_user_id', { length: 20 }).notNull(), // Discord user IDs are numeric strings up to 20 characters

    // Player preferences
    isMobileOnly: boolean('is_mobile_only').notNull().default(false),

    // Clan standing. Null for the vast majority of members; a staff role only
    // decorates a player, it never replaces the points-based rank in `rank`.
    staffRole: staffRoleEnum('staff_role'),

    // Mains are only ever sorted into the single main-account rank, so this
    // decides which ladder `rank` is resolved against.
    //
    // NULL means unresolved, and is what makes the calculator ask the player.
    // TempleOSRS can only settle this when it reports something other than a
    // main — it reports a main both for actual mains and for group ironmen it
    // has never heard of (see `resolveTempleAccountType`).
    accountType: accountTypeEnum('account_type'),

    // The group a group ironman was verified against, kept so the claim can be
    // re-checked against the hiscores later. Group names share the 12-character
    // limit with player names.
    gimGroupName: varchar('gim_group_name', { length: 12 }),

    // Soft-delete flag driven by the daily inactivity reconcile. Inactive
    // players (no XP gain on TempleOSRS beyond the threshold, or no longer in
    // the Temple group) are hidden from the leaderboard but their row is kept
    // so they can be restored automatically if they become active again.
    isActive: boolean('is_active').notNull().default(true),

    // Metadata
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    // Unique constraint on lowercase player name to prevent case-sensitive duplicates
    playerNameLowerUnique: uniqueIndex('players_player_name_lower_unique').on(
      sql`lower(${table.playerName})`,
    ),
  }),
);

export type Player = typeof players.$inferSelect;
export type NewPlayer = typeof players.$inferInsert;

// Player acquired items - relational table for items
export const playerAcquiredItems = pgTable(
  'player_acquired_items',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    playerName: varchar('player_name', { length: 12 }).notNull(),
    itemName: text('item_name').notNull(),
    itemId: integer('item_id').notNull(),
    count: integer('count').notNull().default(1),
    itemCategory: varchar('item_category', { length: 100 }).notNull(),
    dateFirstLogged: timestamp('date_first_logged').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    // Unique constraint to ensure one record per player per item
    playerItemUnique: unique().on(table.playerName, table.itemId),
    // Item-id lookups (clan-wide owner counts / rarity, e.g. Hall of Fame).
    // The unique index above leads with player_name, so it can't serve these.
    itemIdIdx: index('player_acquired_items_item_id_idx').on(table.itemId),
  }),
);

export type PlayerAcquiredItem = typeof playerAcquiredItems.$inferSelect;
export type NewPlayerAcquiredItem = typeof playerAcquiredItems.$inferInsert;

// Player achievement diaries - separate table for achievement diary completion
export const playerAchievementDiaries = pgTable('player_achievement_diaries', {
  id: uuid('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  playerName: varchar('player_name', { length: 12 }).notNull(),
  location: varchar('location', { length: 50 }).notNull(), // e.g., 'Ardougne', 'Desert', etc.
  tier: varchar('tier', { length: 20 }).notNull(), // 'Easy', 'Medium', 'Hard', 'Elite'
  completed: boolean('completed').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export type PlayerAchievementDiary =
  typeof playerAchievementDiaries.$inferSelect;
export type NewPlayerAchievementDiary =
  typeof playerAchievementDiaries.$inferInsert;

// Relations
export const playersRelations = relations(players, ({ many }) => ({
  acquiredItems: many(playerAcquiredItems),
  achievementDiaries: many(playerAchievementDiaries),
  rankUps: many(playerRankUps),
}));

export const playerAcquiredItemsRelations = relations(
  playerAcquiredItems,
  ({ one }) => ({
    player: one(players, {
      fields: [playerAcquiredItems.playerName],
      references: [players.playerName],
    }),
  }),
);

export const playerAchievementDiariesRelations = relations(
  playerAchievementDiaries,
  ({ one }) => ({
    player: one(players, {
      fields: [playerAchievementDiaries.playerName],
      references: [players.playerName],
    }),
  }),
);

export const playerRankUps = pgTable('player_rank_ups', {
  id: uuid('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  playerName: varchar('player_name', { length: 12 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  oldRank: varchar('old_rank', { length: 50 }),
  newRank: varchar('new_rank', { length: 50 }).notNull(),
});

export const playerRankUpsRelations = relations(playerRankUps, ({ one }) => ({
  player: one(players, {
    fields: [playerRankUps.playerName],
    references: [players.playerName],
  }),
}));

// Singleton bookkeeping for scheduled-ish jobs that are triggered by page
// traffic rather than a server cron (there is no long-running server). Each
// job keeps one row keyed by a stable id and records when it last ran, so a
// request can atomically "claim" a run and avoid duplicate work.
export const syncMetadata = pgTable('sync_metadata', {
  id: varchar('id', { length: 50 }).primaryKey(),
  lastRunAt: timestamp('last_run_at').notNull().defaultNow(),
});

export type SyncMetadata = typeof syncMetadata.$inferSelect;
