CREATE TABLE IF NOT EXISTS "player_rank_ups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"player_name" varchar(12) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"old_rank" varchar(50) NOT NULL,
	"new_rank" varchar(50) NOT NULL
);
