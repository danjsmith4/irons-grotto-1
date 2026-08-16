#!/usr/bin/env python3
"""Resolve the OSRS Wiki icon (image) file name for one or more items.

For each item name this:
  1. searches the OSRS Wiki to resolve the exact page title,
  2. fetches that page,
  3. extracts the icon file name from the infobox image cell
     (td.infobox-image.inventory-image.infobox-full-width-content, with a
     fallback to the first td.infobox-image cell).

The printed icon name (spaces, not underscores) is what you pass to
`formatWikiImageUrl(...)` in the rank calculator.

Usage:
    python3 fetch-icon-name.py "Crimson kisten" "Elder venator fang"
"""

import json
import re
import sys
import urllib.parse
import urllib.request

WIKI = "https://oldschool.runescape.wiki"
# Matches clientConstants.wiki.userAgent; a non-empty UA is required by the wiki.
USER_AGENT = "Irons-Grotto-Rank-Calculator (Discord @avios)"

# Exact cell the icon lives in, then a more forgiving fallback.
CELL_PATTERNS = [
    r'<td[^>]*class="[^"]*infobox-image[^"]*inventory-image[^"]*infobox-full-width-content[^"]*"[^>]*>(.*?)</td>',
    r'<td[^>]*class="[^"]*infobox-image[^"]*"[^>]*>(.*?)</td>',
]
IMG_RE = re.compile(r"/images/(?:thumb/)?([^\"/]+\.png)")


def _get(url: str) -> bytes:
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(req, timeout=30) as resp:
        return resp.read()


def resolve_page_title(item: str) -> str | None:
    """Return the best-matching wiki page title for an item name."""
    params = urllib.parse.urlencode(
        {
            "action": "query",
            "list": "search",
            "srsearch": item,
            "srlimit": 3,
            "format": "json",
        }
    )
    data = json.loads(_get(f"{WIKI}/api.php?{params}"))
    results = data.get("query", {}).get("search", [])
    if not results:
        return None
    # Prefer an exact (case-insensitive) title match, else the top hit.
    for hit in results:
        if hit["title"].lower() == item.lower():
            return hit["title"]
    return results[0]["title"]


def extract_icon_name(page_title: str) -> str | None:
    """Return the icon file name (without .png) from a page's infobox."""
    slug = urllib.parse.quote(page_title.replace(" ", "_"))
    html = _get(f"{WIKI}/w/{slug}").decode("utf-8", "replace")
    for pattern in CELL_PATTERNS:
        cell = re.search(pattern, html, re.S)
        if not cell:
            continue
        img = IMG_RE.search(cell.group(1))
        if img:
            return img.group(1)[:-4]  # strip ".png"
    return None


def main(items: list[str]) -> int:
    if not items:
        print(__doc__)
        return 1
    exit_code = 0
    for item in items:
        try:
            title = resolve_page_title(item)
            if not title:
                print(f"{item:28} -> NOT FOUND (no search result)")
                exit_code = 1
                continue
            icon = extract_icon_name(title)
            if not icon:
                print(f"{item:28} -> NOT FOUND (no infobox image on '{title}')")
                exit_code = 1
                continue
            print(f"{item:28} -> {icon}   (page: {title})")
        except Exception as err:  # noqa: BLE001 - surface any network/parse error
            print(f"{item:28} -> ERROR: {err}")
            exit_code = 1
    return exit_code


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
