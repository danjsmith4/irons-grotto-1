CREATE TABLE IF NOT EXISTS "staff_role_changes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"player_name" varchar(12) NOT NULL,
	"old_role" "staff_role",
	"new_role" "staff_role",
	"changed_by_player_name" varchar(12),
	"changed_by_discord_user_id" varchar(20) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "staff_role_changes_player_name_idx" ON "staff_role_changes" USING btree ("player_name");