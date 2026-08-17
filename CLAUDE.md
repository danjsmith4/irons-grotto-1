# CLAUDE.md

OSRS Ironman clan ("Irons' Grotto") **rank calculator**. Turborepo monorepo; the only app is `apps/web` (Next.js App Router). Yarn 4 (`packageManager: yarn@4.5.1`), Node 20.

## Layout
- `apps/web/app/` — Next App Router routes + the rank calculator (`app/rank-calculator/`).
- `apps/web/data/` — the notable-item dataset. `item-list.ts` maps a boss/content name → an `ItemCategory` defined in `data/item-categories/<slug>.ts`. Items are built with `singleItem` / `compoundItem` from `data/utils/item-builders.ts`.
- `apps/web/app/rank-calculator/config/` — point-calculation config: `efficiency-rates.ts` (EHB per boss), `item-point-map.ts` (drop-rate/point modifiers, boss-name maps, overrides), `points.ts` (points-per-hour + milestone tables).
- `apps/web/app/schemas/` — zod schemas (`items.ts`, `osrs.ts`, `wiki.ts`, `temple-api.ts`).

## How notable-item points work
Pipeline: `data-sources/fetch-dropped-item-info.ts` → `utils/calculate-item-points.ts` → `utils/build-notable-item-list.ts` → rendered by `components/item.tsx`.

- Drop rates are fetched live from the **OSRS Wiki bucket API** (`/api.php?action=bucket … bucket("dropsline")`), keyed by the wiki's `Dropped item` name and `Dropped from` source. `DroppedItemResponse` (in `schemas/wiki.ts`) parses/normalises into `{ [itemName]: { [dropSource]: rarity } }`.
- Points ≈ `(1 / (dropRate * modifier / groupSize)) / bossEHB * pointsPerHour * pointModifier * amount`. Requires an **EHB rate for the boss** and a **drop rate for the item+source**.
- An item shows a red **`-`** in the UI when `calculateItemPoints` throws → `hasPointsError: true`. It throws when either: (a) no EHB rate for the resolved boss name, or (b) the wiki response has no entry for `clogName` / `clogName:dropSource`.
- Because the drop data is live wiki data, item configs **drift** when the wiki renames a drop source or item. Two known drift modes:
  - **Item-name casing.** The wiki's `Dropped item` casing drifts (it now returns title case, e.g. `Pet Snakeling`, `Staff of the Dead`) while our clog/config names use in-game casing (`Pet snakeling`). Handled in `schemas/wiki.ts`: `DroppedItemResponse` re-cases the wiki name back to the canonical `CollectionLogItemName` (case-insensitive) at ingestion, so the map key **and** override lookups (`rarityOverrides` etc.) stay stable. This is what makes pet drop rates resolve.
  - **Drop-source string mismatch** (config-side). The drop-source strings in `targetDropSources` (item categories) AND the boss-name/modifier maps in `config/item-point-map.ts` must both match the wiki's `Dropped from` verbatim. e.g. The Gauntlet drifted `#(Corrupted)` → `#Corrupted` (fixed in both `the-gauntlet.ts` and `item-point-map.ts`'s `rewardItemBossNameMap`).

## EHB rates
`config/efficiency-rates.ts` `ehbRates` — **ironman** EHB (points ∝ 1/EHB, so a higher EHB means fewer points). The upper block is copied from TempleOSRS IM EHB; the lower block is self-calculated (has justifying comments — e.g. `Skotizo: 1` is an intentional override, not the Temple value). Refresh the Temple block with `python3 .claude/skills/add-osrs-content/scripts/fetch-ehb-rate.py --all` and diff (last refreshed 2026-08). Boss name resolution order in `calculatePointsForSingleDropSource`: `collectionLogItemBossNameMap[item]` → `rewardItemBossNameMap[dropSource]` → `dropSource`; the resolved name must exist as an `ehbRates` key or the item errors to `-`.

Adding a new boss/drop is a well-defined workflow — use the `add-osrs-content` skill (resolve drops from the wiki, fetch ironman EHB from TempleOSRS, resolve icon names via `osrs-icon-name`, edit the exact file set).

## Running things
- Dev: `cd apps/web && yarn dev` (runs `next dev --experimental-https`, so https://localhost:3000, self-signed cert — expect a browser warning). Next 16 / Turbopack. Needs `apps/web/.env.local`. `GET /api/heartbeat` → 200 is the health check.
- **The calculator is auth-gated.** `middleware.ts` uses Discord auth (`@/auth`); any unauthenticated request to `/rank-calculator/*` gets a 307 redirect to `/`. So the item table (and pet/point rendering) **cannot be validated headlessly / via curl** — it requires a browser Discord login. For programmatic validation of point calc, use the drift canary / hermetic specs instead.
- Tests: **Jest** (not vitest). `cd apps/web && yarn test [pattern]`. `next/jest` resolves the `@/*` alias and global types (`NonEmptyArray`, `OptionalKeys`).
- **`apps/web/jest.env.ts` is required** by `jest.config.ts` (setupFiles) but is untracked/absent on fresh checkouts — Jest won't start without it. It loads `.env.local` via dotenv (Next skips `.env.local` when `NODE_ENV=test`, hence the manual load).
- Server config (`config/constants.server.ts`) parses many env vars at import; `mocks/handlers.ts` imports it, so tests need those vars present in `.env.local`.

## Drift canary
`app/rank-calculator/utils/notable-item-points-drift.spec.ts` hits the **live wiki** and lists every notable item that currently renders `-`. Run it to see what's broken after wiki drift. (Networked — not a hermetic unit test.) `schemas/wiki.spec.ts` is the hermetic guard for the casing normalisation.

## Testing the point calc
- `calculate-item-points.spec.ts` derives its expectations from a config-driven reference oracle (the `denominator / IM EHB` rule) instead of hard-coded totals, so it stays correct when EHB rates are refreshed. Don't reintroduce magic-number expectations.
- `jest.setup.ts` mocks `next/cache` so `unstable_cache`-wrapped data-sources (`fetchItemDropRates`) run under Jest.

## Known pre-existing test gaps (unrelated to features)
- `apps/web/jest.env.ts` is required by `jest.config.ts` but untracked — create it (loads `.env.local`) or tests won't start.
- Much of the wider Jest suite has drifted while unrunnable (e.g. `calculate-scaling.spec.ts` asserts `0.1` but the fn returns `1`). These are stale expectations independent of any single feature — refresh with domain judgement when touching those areas.
