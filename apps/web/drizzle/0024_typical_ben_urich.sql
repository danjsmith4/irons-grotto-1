CREATE TYPE "public"."clan_event_type" AS ENUM('sotw', 'botw');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "clan_event_wins" (
	"event_id" integer NOT NULL,
	"player_name" varchar(12) NOT NULL,
	"placement" integer DEFAULT 1 NOT NULL,
	"gained" integer DEFAULT 0 NOT NULL,
	"recorded_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "clan_event_wins_event_id_player_name_pk" PRIMARY KEY("event_id","player_name")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "clan_events" (
	"id" integer PRIMARY KEY NOT NULL,
	"type" "clan_event_type" NOT NULL,
	"name" varchar(120) NOT NULL,
	"metric_id" integer NOT NULL,
	"metric_name" varchar(60) NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"competition_key" varchar(64),
	"created_by_player_name" varchar(12),
	"created_by_discord_id" varchar(20),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "clan_event_wins_player_name_idx" ON "clan_event_wins" USING btree ("player_name");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "clan_events_starts_at_idx" ON "clan_events" USING btree ("starts_at");