CREATE TYPE "public"."accomplishment_type" AS ENUM('collection_log', 'total_level', 'ehb', 'ehp', 'maxed', 'elite_diary', 'diary_cape', 'combat_achievement', 'inferno', 'colosseum', 'blood_torva', 'radiant_oathplate', 'toa_cursed_phalanx', 'pet');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "player_accomplishments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"player_name" varchar(12) NOT NULL,
	"type" "accomplishment_type" NOT NULL,
	"accomplishment_key" text NOT NULL,
	"label" text NOT NULL,
	"value" real,
	"icon_item_name" text,
	"is_backfilled" boolean DEFAULT false NOT NULL,
	"achieved_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "player_accomplishments_player_name_accomplishment_key_unique" UNIQUE("player_name","accomplishment_key")
);
--> statement-breakpoint
ALTER TABLE "players" ADD COLUMN "accomplishments_backfilled_at" timestamp;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "player_accomplishments_achieved_at_idx" ON "player_accomplishments" USING btree ("achieved_at");