CREATE TABLE IF NOT EXISTS "sync_metadata" (
	"id" varchar(50) PRIMARY KEY NOT NULL,
	"last_run_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "players" ADD COLUMN "is_active" boolean DEFAULT true NOT NULL;