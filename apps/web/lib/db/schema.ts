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
  primaryKey,
  jsonb,
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

/**
 * The kind of accomplishment, and the *only* thing that decides its icon and
 * its grouping in the feed — see `config/accomplishments.ts`, which maps each
 * value to a wiki image and a display name.
 *
 * Adding a value here is the whole cost of adding a new accomplishment: the
 * detector in `app/utils/detect-accomplishments.ts` decides when it is earned,
 * and the config decides how it looks.
 */
export const accomplishmentTypeEnum = pgEnum('accomplishment_type', [
  // Threshold milestones — earned repeatedly, once per threshold crossed.
  'collection_log',
  'total_level',
  'ehb',
  'ehp',
  // One-off feats.
  'maxed',
  'elite_diary',
  'diary_cape',
  'combat_achievement',
  'inferno',
  'colosseum',
  'blood_torva',
  'radiant_oathplate',
  'toa_cursed_phalanx',
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
  accomplishments: many(playerAccomplishments),
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

/**
 * Notable items a player has ticked that no data source accounts for.
 *
 * `player_acquired_items` holds what TempleOSRS reports from the collection
 * log, and quest/combat-achievement items are derived live from WikiSync. What
 * neither covers is the player reaching into the calculator and ticking
 * something themselves — an item Temple has not caught up on, or one that is
 * only evidenced by a screenshot. Until this table, that lived **only in the
 * Redis draft**, which made the draft impossible to delete without losing it.
 *
 * **Sparse, not a materialised map.** A row exists only where the player's
 * answer *differs* from what the sources derive. So:
 *
 *     effective = derived(collection log ∪ quests ∪ CAs) ⊕ overrides
 *
 * Three things fall out of that, all of them wanted:
 *
 * - It self-heals. When Temple catches up and the derived set agrees, the row
 *   is deleted, and the moderator's submission diff shrinks by itself.
 * - It stays correct as `data/item-list.ts` changes — which it does routinely,
 *   via the `add-osrs-content` skill. A materialised map would accumulate rows
 *   for items that no longer exist.
 * - It *is* the discrepancy list. An override with `is_acquired = true` is
 *   exactly "the player claims this and no source agrees", which is what the
 *   submission diff already wants to show a moderator.
 */
export const playerItemOverrides = pgTable(
  'player_item_overrides',
  {
    playerName: varchar('player_name', { length: 12 }).notNull(),
    /**
     * The form's own key for the item — `stripEntityName(item.name)`. Stored
     * verbatim so it round-trips through the calculator without translation.
     */
    itemName: text('item_name').notNull(),
    /**
     * The player's answer. `false` is meaningful: it is an explicit untick of
     * something a source *does* report, which is why this is not simply a list
     * of claimed items.
     */
    isAcquired: boolean('is_acquired').notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    playerItemOverridePk: primaryKey({
      columns: [table.playerName, table.itemName],
    }),
  }),
);

export type PlayerItemOverride = typeof playerItemOverrides.$inferSelect;
export type NewPlayerItemOverride = typeof playerItemOverrides.$inferInsert;

export const playerItemOverridesRelations = relations(
  playerItemOverrides,
  ({ one }) => ({
    player: one(players, {
      fields: [playerItemOverrides.playerName],
      references: [players.playerName],
    }),
  }),
);

/**
 * Notable things a member has done, as a feed alongside rank ups and clogs.
 *
 * Detection is *stateless*: `detectAccomplishments` reports everything a player
 * currently qualifies for and every row is inserted `on conflict do nothing`
 * against `(player_name, accomplishment_key)`. Nothing has to diff against the
 * previous run, so a re-run is free and a missed run is caught up rather than
 * lost — but it also means the row's own timestamp is the only record of
 * *when* something happened, which is why `achieved_at` is set explicitly
 * (from the collection log's own date where there is one) rather than defaulted.
 */
export const playerAccomplishments = pgTable(
  'player_accomplishments',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    playerName: varchar('player_name', { length: 12 }).notNull(),
    type: accomplishmentTypeEnum('type').notNull(),

    /**
     * Stable identity of this exact accomplishment, e.g. `collection_log:1000`
     * or `elite_diary:Morytania`. This is the dedupe key, so it must never
     * encode anything that can change after the fact (a display label, a
     * count) or the same feat would be announced twice.
     */
    accomplishmentKey: text('accomplishment_key').notNull(),

    /** Rendered as-is in the feed, e.g. "1,000 collection log slots". */
    label: text('label').notNull(),

    /** The threshold reached, for milestones. Null for one-off feats. */
    value: real('value'),

    achievedAt: timestamp('achieved_at').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    // One row per accomplishment per player — this is what makes re-running
    // the detector a no-op rather than a duplicate.
    playerAccomplishmentUnique: unique().on(
      table.playerName,
      table.accomplishmentKey,
    ),
    // The feed's only query: newest first across every player.
    achievedAtIdx: index('player_accomplishments_achieved_at_idx').on(
      table.achievedAt,
    ),
  }),
);

export type PlayerAccomplishment = typeof playerAccomplishments.$inferSelect;
export type NewPlayerAccomplishment = typeof playerAccomplishments.$inferInsert;

export const playerAccomplishmentsRelations = relations(
  playerAccomplishments,
  ({ one }) => ({
    player: one(players, {
      fields: [playerAccomplishments.playerName],
      references: [players.playerName],
    }),
  }),
);

/**
 * Every change to `players.staff_role`, and who made it.
 *
 * A staff role is the only thing on this site that grants elevated access, and
 * the admin dashboard hands it out from inside the app rather than from the
 * database, so each grant and revoke is written down. The actor is recorded by
 * Discord id as well as by player name because the ladder is checked against
 * the signed-in Discord account, and that is the identity that actually
 * authorised the change.
 */
export const staffRoleChanges = pgTable(
  'staff_role_changes',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    playerName: varchar('player_name', { length: 12 }).notNull(),
    oldRole: staffRoleEnum('old_role'),
    newRole: staffRoleEnum('new_role'),
    changedByPlayerName: varchar('changed_by_player_name', { length: 12 }),
    changedByDiscordUserId: varchar('changed_by_discord_user_id', {
      length: 20,
    }).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    playerNameIdx: index('staff_role_changes_player_name_idx').on(
      table.playerName,
    ),
  }),
);

export type StaffRoleChange = typeof staffRoleChanges.$inferSelect;
export type NewStaffRoleChange = typeof staffRoleChanges.$inferInsert;

export const rankSubmissionStatusEnum = pgEnum('rank_submission_status', [
  'pending',
  'approved',
  'rejected',
]);

/**
 * A member's application for a rank, and its review.
 *
 * Previously three Redis keys per submission — the snapshot, a metadata hash
 * and a diff hash — which meant the only record of who was promoted, by whom,
 * and over what disagreement lived outside the database entirely.
 *
 * **The snapshot is `jsonb`, deliberately, and versioned.** It is evidentiary
 * rather than queryable: its one reader loads it whole into a disabled form so
 * a moderator can see the sheet as submitted. Normalising it would couple a
 * historical record to today's `players` schema — add a column and every past
 * submission silently gains a value it never had; drop one and history is
 * rewritten. An immutable record must not be editable by a migration.
 *
 * Same reasoning for `diff`: a fixed nine-key record, four of whose values are
 * maps or arrays. Nine columns would buy nothing.
 *
 * The four data-source flags **do** get real columns — `approveSubmission`
 * branches on `has_wikisync_data`, and together they are the auto-approval
 * predicate, so they are read as data rather than as evidence.
 */
export const rankSubmissions = pgTable(
  'rank_submissions',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    playerName: varchar('player_name', { length: 12 }).notNull(),

    submittedByDiscordId: varchar('submitted_by_discord_id', {
      length: 20,
    }).notNull(),
    submittedAt: timestamp('submitted_at').defaultNow().notNull(),

    /**
     * The rank applied for, and the one held at the time.
     *
     * Nullable because neither was recorded anywhere before this table: the
     * snapshot is the form *minus* `rank` and `points`, and the metadata hash
     * never carried them — they existed only in the Discord embed. Backfilled
     * rows therefore have none, and the moderator view shows "—".
     *
     * Going forward this is what approval reads, rather than taking the rank
     * from whatever the client posts.
     */
    rank: varchar('rank', { length: 50 }),
    previousRank: varchar('previous_rank', { length: 50 }),
    totalPoints: real('total_points'),

    status: rankSubmissionStatusEnum('status').notNull().default('pending'),
    actionedByDiscordId: varchar('actioned_by_discord_id', { length: 20 }),
    actionedAt: timestamp('actioned_at'),
    isAutomatic: boolean('is_automatic').notNull().default(false),

    /**
     * A string, and Postgres will keep it one. The second Redis client
     * (`redisRaw`) existed solely because Upstash coerced this to a number.
     */
    discordMessageId: varchar('discord_message_id', { length: 20 }).notNull(),

    hasTemplePlayerStats: boolean('has_temple_player_stats').notNull(),
    hasTempleCollectionLog: boolean('has_temple_collection_log').notNull(),
    hasWikiSyncData: boolean('has_wikisync_data').notNull(),
    isTempleCollectionLogOutdated: boolean(
      'is_temple_collection_log_outdated',
    ).notNull(),

    /** `{ version: 1, data: RankSubmissionSnapshotV1 }` */
    snapshot: jsonb('snapshot').notNull(),
    /** `{ version: 1, data: RankSubmissionDiff }` */
    diff: jsonb('diff').notNull(),

    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    playerNameIdx: index('rank_submissions_player_name_idx').on(
      table.playerName,
    ),
    // The moderation queue: pending first, newest first.
    statusIdx: index('rank_submissions_status_submitted_at_idx').on(
      table.status,
      table.submittedAt,
    ),
    discordMessageIdUnique: uniqueIndex(
      'rank_submissions_discord_message_id_unique',
    ).on(table.discordMessageId),
  }),
);

export type RankSubmission = typeof rankSubmissions.$inferSelect;
export type NewRankSubmission = typeof rankSubmissions.$inferInsert;

// Singleton bookkeeping for scheduled-ish jobs that are triggered by page
// traffic rather than a server cron (there is no long-running server). Each
// job keeps one row keyed by a stable id and records when it last ran, so a
// request can atomically "claim" a run and avoid duplicate work.
export const syncMetadata = pgTable('sync_metadata', {
  id: varchar('id', { length: 50 }).primaryKey(),
  lastRunAt: timestamp('last_run_at').notNull().defaultNow(),
});

export type SyncMetadata = typeof syncMetadata.$inferSelect;
