-- Hand-added, and required: the last statement in this file casts every
-- existing `type` value into the recreated enum, and any surviving 'pet' row
-- would fail that cast with `invalid input value for enum`. The backfill has
-- already written pet rows, so this is not hypothetical.
--
-- Pets stop being accomplishments here. Every pet is a collection log slot, so
-- it already appears in the collection-log feed alongside every other drop.
DELETE FROM "player_accomplishments" WHERE "type" = 'pet';--> statement-breakpoint
ALTER TABLE "player_accomplishments" DROP COLUMN IF EXISTS "icon_item_name";--> statement-breakpoint
ALTER TABLE "player_accomplishments" DROP COLUMN IF EXISTS "is_backfilled";--> statement-breakpoint
ALTER TABLE "players" DROP COLUMN IF EXISTS "accomplishments_backfilled_at";--> statement-breakpoint
ALTER TABLE "public"."player_accomplishments" ALTER COLUMN "type" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "public"."accomplishment_type";--> statement-breakpoint
CREATE TYPE "public"."accomplishment_type" AS ENUM('collection_log', 'total_level', 'ehb', 'ehp', 'maxed', 'elite_diary', 'diary_cape', 'combat_achievement', 'inferno', 'colosseum', 'blood_torva', 'radiant_oathplate', 'toa_cursed_phalanx');--> statement-breakpoint
ALTER TABLE "public"."player_accomplishments" ALTER COLUMN "type" SET DATA TYPE "public"."accomplishment_type" USING "type"::"public"."accomplishment_type";