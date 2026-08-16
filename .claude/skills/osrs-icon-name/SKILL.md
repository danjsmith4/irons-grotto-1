---
name: osrs-icon-name
description: Resolve the OSRS Wiki icon (image) file name for an in-game item, used when adding items to the rank calculator (e.g. item-categories, `formatWikiImageUrl`). Use whenever you need the exact icon name for an item and it is not obviously `Item_name_with_underscores` — the wiki icon file name is not always deterministic from the display name, so it must be looked up. Also use when asked to "find the icon name", "search the OSRS wiki for an item", or wire up a new boss/drop.
---

# OSRS icon-name resolver

The rank calculator builds item image URLs with
`formatWikiImageUrl(iconName)` (`apps/web/app/rank-calculator/utils/format-wiki-url.ts`),
which does `iconName.replaceAll(' ', '_')` and points at
`https://oldschool.runescape.wiki/images/thumb/<Icon>.png/...`.

For most items the icon name is just the display name with spaces replaced by
underscores (e.g. `Twisted bow` → `Twisted_bow`). **But this is not guaranteed** —
some items use a different image file name (capitalisation, disambiguation
suffixes, `(uncharged)` variants, chatheads for category images, etc.). When it
is not obviously deterministic, look it up on the wiki instead of guessing.

## How the icon name is defined

On an item's wiki page, the inventory icon lives in the infobox on the right in
this cell:

```
td.infobox-image.inventory-image.infobox-full-width-content
```

Inside it is an `<img>` whose source is `/images/thumb/<Icon>.png/...` (or
`/images/<Icon>.png`). **`<Icon>` — the `.png` file name without the extension —
is the icon name** we pass to `formatWikiImageUrl`.

If that exact cell is missing, fall back to the first `td.infobox-image` cell
(the top image of the infobox table on the right).

## Steps

1. **Search** the wiki to resolve the exact page title (handles capitalisation
   and near-misses):
   `https://oldschool.runescape.wiki/api.php?action=query&list=search&srsearch=<item>&format=json`
2. **Fetch** the resolved page: `https://oldschool.runescape.wiki/w/<Page_Title>`.
3. **Extract** the icon from the infobox image cell above.
4. Use the returned name verbatim in `formatWikiImageUrl('<Icon name with spaces>')`
   or as an item's `image` / `clogName`.

Always send a descriptive `User-Agent` header (the wiki rejects blank agents).
This repo already uses `Irons-Grotto-Rank-Calculator (Discord @avios)`
(`clientConstants.wiki.userAgent`).

## Helper script

`scripts/fetch-icon-name.py` does all three steps for one or more items:

```bash
python3 .claude/skills/osrs-icon-name/scripts/fetch-icon-name.py "Crimson kisten" "Elder venator fang"
```

Output (one line per item):

```
Crimson kisten        -> Crimson_kisten   (page: Crimson kisten)
Elder venator fang    -> Elder_venator_fang   (page: Elder venator fang)
```

Prefer this script for accuracy; only hand-derive an icon name when the script
is unavailable. If the script reports `NOT FOUND`, open the page in a browser and
read the infobox image cell manually — the item may be a redirect or use a
non-standard infobox.
