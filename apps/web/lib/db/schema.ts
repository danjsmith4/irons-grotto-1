import {
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
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm/sql/sql';
import { relations } from 'drizzle-orm';

// uuid-ossp extension is required for gen_random_uuid()
// Make sure to enable it in your database with: CREATE EXTENSION IF NOT EXISTS "pgcrypto";

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