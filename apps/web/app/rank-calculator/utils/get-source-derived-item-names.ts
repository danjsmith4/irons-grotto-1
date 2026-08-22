import { ItemCategoryMap, isCollectionLogItem } from '@/app/schemas/items';
import { stripEntityName } from './strip-entity-name';

/**
 * The notable items no collection log records.
 *
 * Everything else in the list is a collection log slot, and a slot is durable:
 * `player_acquired_items` keeps a copy, so it can be re-read when a source is
 * quiet. These cannot be, because nothing logs them — they are settled by a
 * live WikiSync read of the player's quests, combat achievements and music
 * tracks, which is why they need `player_derived_items` to have a home at all.
 *
 * Derived from the list rather than named, so a new `questItem` or
 * `manualItem` is picked up without anyone remembering to update a constant.
 * As of writing it resolves to six: Barrows gloves, Book of the dead, Quest
 * cape, Mage Arena 2 cape, 6 Jads and Music cape.
 */
export function getSourceDerivedItemNames(
  notableItemList: ItemCategoryMap,
): string[] {
  return Object.values(notableItemList)
    .flatMap(({ items }) => items)
    .filter((item) => !isCollectionLogItem(item))
    .map(({ name }) => stripEntityName(name));
}
