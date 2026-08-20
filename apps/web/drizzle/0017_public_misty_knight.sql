CREATE TYPE "public"."account_type" AS ENUM('main', 'ironman', 'hardcore_ironman', 'ultimate_ironman', 'group_ironman', 'hardcore_group_ironman', 'unranked_group_ironman');--> statement-breakpoint
CREATE TYPE "public"."staff_role" AS ENUM('moderator', 'admin', 'deputy_owner', 'owner');--> statement-breakpoint
ALTER TABLE "players" ADD COLUMN "staff_role" "staff_role";--> statement-breakpoint
ALTER TABLE "players" ADD COLUMN "account_type" "account_type";--> statement-breakpoint
ALTER TABLE "players" ADD COLUMN "gim_group_name" varchar(12);--> statement-breakpoint
-- Backfill. The staff/main "rank structures" this replaces were only ever
-- visible as the player's rank, so that is where the existing values live.
UPDATE "players" SET "staff_role" = 'owner' WHERE "rank" = 'Owner';--> statement-breakpoint
UPDATE "players" SET "staff_role" = 'deputy_owner' WHERE "rank" = 'Deputy Owner';--> statement-breakpoint
UPDATE "players" SET "staff_role" = 'admin' WHERE "rank" = 'Administrator';--> statement-breakpoint
UPDATE "players" SET "staff_role" = 'moderator' WHERE "rank" = 'Moderator';--> statement-breakpoint
-- Anyone already carrying the main-account rank is a settled main, so they are
-- resolved and never see the prompt. Everyone else starts NULL: the next
-- calculator load resolves them from TempleOSRS, and only those Temple cannot
-- settle (mains and group ironmen alike, which it cannot tell apart) are asked.
-- Staff keep their stale rank until the next sync recalculates it from points.
UPDATE "players" SET "account_type" = 'main' WHERE "rank" = 'Looter';
