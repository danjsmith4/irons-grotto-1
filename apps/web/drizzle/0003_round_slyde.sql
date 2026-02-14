CREATE TABLE IF NOT EXISTS "player_achievement_diaries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"player_name" varchar(12) NOT NULL,
	"location" varchar(50) NOT NULL,
	"tier" varchar(20) NOT NULL,
	"completed" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "player_acquired_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"player_name" varchar(12) NOT NULL,
	"item_name" text NOT NULL,
	"item_id" integer NOT NULL,
	"count" integer DEFAULT 1 NOT NULL,
	"item_category" varchar(100) NOT NULL,
	"date_first_logged" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "players" (
	"player_name" varchar(12) PRIMARY KEY NOT NULL,
	"join_date" date NOT NULL,
	"ehb" real DEFAULT 0 NOT NULL,
	"ehp" real DEFAULT 0 NOT NULL,
	"combat_achievement_tier" varchar(50) DEFAULT 'None' NOT NULL,
	"rank" varchar(50) NOT NULL,
	"proof_link" text,
	"collection_log_count" integer DEFAULT 0 NOT NULL,
	"collection_log_total" integer DEFAULT 0 NOT NULL,
	"total_level" integer DEFAULT 32 NOT NULL,
	"clue_count_beginner" integer DEFAULT 0 NOT NULL,
	"clue_count_easy" integer DEFAULT 0 NOT NULL,
	"clue_count_medium" integer DEFAULT 0 NOT NULL,
	"clue_count_hard" integer DEFAULT 0 NOT NULL,
	"clue_count_elite" integer DEFAULT 0 NOT NULL,
	"clue_count_master" integer DEFAULT 0 NOT NULL,
	"tzhaar_cape" varchar(50) DEFAULT 'None' NOT NULL,
	"has_blood_torva" boolean DEFAULT false NOT NULL,
	"has_radiant_oathplate" boolean DEFAULT false NOT NULL,
	"has_dizanas_quiver" boolean DEFAULT false NOT NULL,
	"has_achievement_diary_cape" boolean DEFAULT false NOT NULL,
	"combat_bonus_points" real DEFAULT 0 NOT NULL,
	"skilling_bonus_points" real DEFAULT 0 NOT NULL,
	"collection_log_bonus_points" real DEFAULT 0 NOT NULL,
	"notable_items_bonus_points" real DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DROP TABLE "bingo_completions" CASCADE;