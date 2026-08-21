CREATE TABLE IF NOT EXISTS "player_item_overrides" (
	"player_name" varchar(12) NOT NULL,
	"item_name" text NOT NULL,
	"is_acquired" boolean NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "player_item_overrides_player_name_item_name_pk" PRIMARY KEY("player_name","item_name")
);
