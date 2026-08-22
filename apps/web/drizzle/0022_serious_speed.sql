CREATE TYPE "public"."rank_submission_status" AS ENUM('pending', 'approved', 'rejected');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "rank_submissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"player_name" varchar(12) NOT NULL,
	"submitted_by_discord_id" varchar(20) NOT NULL,
	"submitted_at" timestamp DEFAULT now() NOT NULL,
	"rank" varchar(50),
	"previous_rank" varchar(50),
	"total_points" real,
	"status" "rank_submission_status" DEFAULT 'pending' NOT NULL,
	"actioned_by_discord_id" varchar(20),
	"actioned_at" timestamp,
	"is_automatic" boolean DEFAULT false NOT NULL,
	"discord_message_id" varchar(20) NOT NULL,
	"has_temple_player_stats" boolean NOT NULL,
	"has_temple_collection_log" boolean NOT NULL,
	"has_wikisync_data" boolean NOT NULL,
	"is_temple_collection_log_outdated" boolean NOT NULL,
	"snapshot" jsonb NOT NULL,
	"diff" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "rank_submissions_player_name_idx" ON "rank_submissions" USING btree ("player_name");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "rank_submissions_status_submitted_at_idx" ON "rank_submissions" USING btree ("status","submitted_at");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "rank_submissions_discord_message_id_unique" ON "rank_submissions" USING btree ("discord_message_id");