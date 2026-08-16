#!/usr/bin/env python3
"""Fetch ironman (IM) EHB rates from TempleOSRS.

This clan is an ironman clan, so the rank calculator uses IM EHB rates
(`ehbRates` in apps/web/app/rank-calculator/config/efficiency-rates.ts). This
scrapes https://templeosrs.com/efficiency/pvm.php?ehb=im and prints the
boss -> EHB pairs.

Usage:
    # Print the rate(s) for one or more bosses (case-insensitive substring):
    python3 fetch-ehb-rate.py "Vorkath" "Zulrah"

    # Dump every boss and rate:
    python3 fetch-ehb-rate.py --all

Note: TempleOSRS names may differ slightly from the wiki / our config
(e.g. "The Royal Titans"). Use the printed name as the `ehbRates` key, or map
it to the drop source you pass as `targetDropSources`.
"""

import re
import sys
import urllib.request

URL = "https://templeosrs.com/efficiency/pvm.php?ehb=im"
USER_AGENT = "Irons-Grotto-Rank-Calculator (Discord @avios)"

# Each boss row renders as:
#   ...sr-record-count ...">NAME</div>...</td><td>EHB</td>...
ROW_RE = re.compile(
    r'sr-record-count[^"]*">([^<]+)</div>.*?</td><td>([\d.]+)</td>', re.S
)


def fetch_rates() -> dict[str, float]:
    req = urllib.request.Request(URL, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(req, timeout=30) as resp:
        html = resp.read().decode("utf-8", "replace")
    rates: dict[str, float] = {}
    for name, ehb in ROW_RE.findall(html):
        name = name.strip()
        value = float(ehb)
        rates[name] = int(value) if value.is_integer() else value
    if not rates:
        raise RuntimeError(
            "Parsed 0 rows — TempleOSRS markup may have changed; update ROW_RE."
        )
    return rates


def main(args: list[str]) -> int:
    try:
        rates = fetch_rates()
    except Exception as err:  # noqa: BLE001 - surface network/parse failure
        print(f"ERROR: {err}")
        return 1

    if not args or args == ["--all"]:
        for name in sorted(rates):
            print(f"  {name:34} {rates[name]}")
        return 0

    exit_code = 0
    for query in args:
        matches = {n: r for n, r in rates.items() if query.lower() in n.lower()}
        if not matches:
            print(f"{query:28} -> NOT FOUND on TempleOSRS IM EHB page")
            exit_code = 1
            continue
        for name, rate in sorted(matches.items()):
            print(f"{query:28} -> {name}: {rate} EHB")
    return exit_code


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
