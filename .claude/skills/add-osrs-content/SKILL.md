---
name: add-osrs-content
description: End-to-end workflow for adding a new OSRS boss / piece of content (its unique drops and pet) to the rank calculator's notable-item list. Use when asked to "add <boss>", "add a new boss/raid/content", wire up new drops, or register a new collection-log category. Covers resolving the boss + drops from the OSRS Wiki, fetching the ironman EHB rate from TempleOSRS, resolving icon names, and the exact set of files to edit.
---

# Add new OSRS content to the rank calculator

Adds a boss and its notable drops so they appear as a category with points.
Points are computed **dynamically** at runtime from live wiki drop rates ÷ the
boss EHB (see `calculateItemPoints` in
`apps/web/app/rank-calculator/utils/calculate-item-points.ts` and
`pointsConfig.notableItemsPointsPerHour`), so you do **not** hand-calculate
points — you just supply the drops, drop sources, and the boss's EHB rate.

This is an **ironman clan**, so always use **IM EHB** rates.

## Research (gather facts before editing)

For a boss named `<Boss>`:

1. **Resolve the boss + its drops.** Pull the drop table from the wiki (cleaner
   than scraping HTML):
   `https://oldschool.runescape.wiki/api.php?action=parse&page=<Boss>&prop=wikitext&format=json`
   Read the `{{DropsLine|name=...|rarity=...}}` rows. Identify the uniques and
   the pet (a pet is usually the rarest tertiary, ~1/1000–1/5000, and its page
   is an `Infobox NPC` / "Follower"). **Watch for the trap:** a request like
   "add X, Y and Z" may be one boss plus two of its drops, not three bosses —
   check the drop table before assuming.
2. **Confirm the exact drop-source string** (used as `targetDropSources` and the
   `ehbRates` key) via the bucket API:
   `https://oldschool.runescape.wiki/api.php?action=bucket&query=bucket("dropsline").select("drop_json").where("item_name","<Item>").run()&format=json`
   → read `Dropped from`.
3. **Fetch the IM EHB rate** from TempleOSRS (see script below). If the boss is
   too new to be listed, ask the user for the rate.
4. **Resolve icon names** with the `osrs-icon-name` skill. Most are
   `Item_name_with_underscores`, but not all — verify.
   **Gotcha:** `formatWikiImageUrl` always builds a `/thumb/.../64px-...` URL,
   and the wiki returns HTTP 500 for a thumbnail larger than the source image.
   Many new item icons are tiny (e.g. 25×28), so their default thumb URL is
   broken. When the `64px` thumb 500s, pin the item's `image` to the full
   (non-thumb) URL instead: `https://oldschool.runescape.wiki/images/<Icon>.png`
   (existing precedent: `revenants.ts`, `miscellaneous-wilderness-items.ts`).
   Always verify whichever image URL you choose returns 200 before committing.
5. **Find the TempleOSRS collection-log category slug.** It comes from
   `https://templeosrs.com/api/collection-log/categories.php` (e.g. `the_mad_angel`,
   `maggot_king`). This is often NOT the same shape as the boss name.
6. **Pick a category image** that resolves as a `.png` (the URL builder only
   emits `.png`). Verify the thumb URL returns 200 before using it — some NPC
   images are `.webp`.

### Helper: IM EHB rate

```bash
python3 .claude/skills/add-osrs-content/scripts/fetch-ehb-rate.py "Vorkath"
python3 .claude/skills/add-osrs-content/scripts/fetch-ehb-rate.py --all
```

Source: `https://templeosrs.com/efficiency/pvm.php?ehb=im` (`im` = ironman).

## Files to edit

Follow the `yama` / `royal-titans` pattern (dynamic points, no explicit
`points`). Reference: `apps/web/data/item-categories/yama.ts`.

1. **New category file** `apps/web/data/item-categories/<boss-kebab>.ts`:
   ```ts
   import { formatWikiImageUrl } from '@/app/rank-calculator/utils/format-wiki-url';
   import { ItemCategory } from '@/app/schemas/items';
   import { singleItem } from '../utils/item-builders';

   export const <bossCamel>: ItemCategory = {
     image: formatWikiImageUrl('<Boss>', 'category'),
     items: [
       singleItem({
         name: '<Unique>',
         collectionLogCategory: '<temple_slug>',
         targetDropSources: ['<Drop source>'],
         // Set `image` when the default thumb URL doesn't resolve:
         // - different icon name:  image: formatWikiImageUrl('<Icon name>'),
         // - tiny icon (thumb 500s): image: 'https://oldschool.runescape.wiki/images/<Icon>.png',
       }),
       // ...the pet is just another singleItem
     ],
   };
   ```
2. **Register it** in `apps/web/data/item-list.ts`: add the import and a
   `'<Boss>': <bossCamel>,` entry in the `itemList` map.
3. **EHB rate** in `apps/web/app/rank-calculator/config/efficiency-rates.ts`:
   add `'<Drop source>': <ehb>,` to `ehbRates` (key must match the drop source
   so `calculatePointsForSingleDropSource` resolves it).
4. **Item names** in `apps/web/app/schemas/osrs.ts`: add each drop + pet name to
   the `CollectionLogItemName` enum (`singleItem`'s `clogName` is typed to it).
5. **Temple category** in `apps/web/app/schemas/temple-api.ts`: add the slug to
   `TempleOSRSCollectionLogCategory`.

## Verify

```bash
cd apps/web && npx tsc --noEmit --project tsconfig.app.json   # ignore TS6305 noise
```

The `satisfies ItemCategoryMap` / `satisfies Record<string, number>` and the
enum-typed `clogName` mean a clean typecheck confirms the wiring. Optionally spin
up the dev server (`yarn dev`, then `https://localhost:3000/rank-calculator`) and
confirm the new category renders with sensible points (`ceil((1/rate)/ehb)`).

## Related

- `osrs-icon-name` skill — resolve an item's wiki icon file name.
