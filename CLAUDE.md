# CLAUDE.md

OSRS Ironman clan ("Irons' Grotto") **rank calculator**. Turborepo monorepo; the only app is `apps/web` (Next.js App Router). Yarn 4 (`packageManager: yarn@4.5.1`), Node 20.

Beyond the calculator, `apps/web` also serves a public homepage, leaderboard, dashboard and clan activity feeds (Radix Themes + Tailwind, Postgres/Drizzle, `@upstash/redis`, Discord bot integration).

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
- **The calculator is auth-gated.** `middleware.ts` uses Discord auth (`@/auth`); any unauthenticated request to `/rank-calculator/*` gets a 307 redirect to `/`. So the item table (and pet/point rendering) **cannot be validated headlessly / via curl** — it requires a browser Discord login. For programmatic validation of point calc, use the drift canary / hermetic specs instead. (The homepage, leaderboard and player profiles ARE public, so those can be validated headlessly.)
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

## Theming / colors — read before touching any color

The whole UI is driven by **one block of semantic tokens** at the top of `apps/web/app/globals.css`. They are the single source of truth, derived from the clan logo (`apps/web/public/L1.png`): an indigo-navy structure with a cool **green→teal→blue** accent family.

- Tokens are stored as **`R G B` channel triples** so they compose with opacity:
  ```css
  color: rgb(var(--ig-text));
  border: 1px solid rgb(var(--ig-secondary) / 0.4);
  ```
- **Green (`--ig-secondary`) is the interactive accent** (buttons, links, focus, progress); **navy is structure**. The Radix `--accent-*` (green) and `--gray-*` (navy) scales are **derived from the base tokens via `color-mix()`** — don't hand-edit individual scale steps, change the base token.
- **Never hardcode a hex/rgba in a component.** Use `var(--ig-*)`. A component with a raw color is a bug — funnel it into a token. CSS Modules can use the tokens too (they're global custom properties).
- **Re-theme or revert the entire app by editing only the `--ig-*` block** (~16 lines). That's a hard requirement — keep it true.
- `<Theme accentColor="grass">` in `app/layout.tsx` is the Radix base; the `globals.css` overrides do the real work.

## Design language ("data-desk")

Clean, data-forward minimalism on the dark navy base (think Linear / Vercel / tracker.gg). Brand personality comes from **type + the green accent + the logo**, not texture or neon.

- **Type system** (`layout.tsx` → CSS vars, mapped to Radix): **Space Grotesk** display/headings (`--font-display`), **Inter** body (`--font-body`), **JetBrains Mono** data/numbers (`--font-mono`). Stat/number columns use `.ig-tabular` (mono + `tabular-nums`). Micro-labels use `.ig-eyebrow`.
- **Green is a deliberate accent** — buttons, links, focus, active sort, small highlights only. Structure is **hairline** (`rgb(var(--ig-text-muted) / 0.1)`) borders + typography, not colored borders. Buttons are flat (solid green + dark `--ig-on-accent` text, or hairline ghost) — no gradient fills, lift, or glow.
- **No emoji as UI**, no neon glow / floating / rotating-ray backgrounds. Headers use the `<SectionHeader>` primitive (`app/components/section-header.tsx`): display title + muted subtitle + muted radix-icon + actions slot.
- **Reusable primitives:** `SectionHeader`; the activity-feed style (`app/components/activity-feed.module.css`) shared by the rank-ups + collection-log feeds (item/rank tile + two-line entry + count badge + mono time); the leaderboard's `leaderboard.module.css`.
- **Infinite scroll everywhere — no "Load more" buttons.** Paginated lists auto-fetch near the scroll end (leaderboard `handleScroll`; clogs scroller `onLoadMore`).

## Clan data components

The DB stores far more than the leaderboard shows; these surface it (all in `app/components`, data in `app/data-sources`):

- **`ClanStats`** ("Grotto at a glance") ← `fetchClanStats` — aggregate KPIs over active players.
- **`PlayerProfileModal`** — opens over the current window when a player name is clicked. Fetches `GET /api/player-profile?name=` (→ `fetchPlayerProfile`): rank progress vs `rankThresholds`, stat grid, notable-item badges, clue tiers, achievement-diary matrix (`playerAchievementDiaries`, otherwise unused), and rank-up timeline.
- **`RarestDrops`** ("Rarest in the Grotto") ← `fetchCollectionLogInsights` — items the fewest members have logged, from `playerAcquiredItems`.

**Clickable player names, app-wide.** The profile modal is hosted once by `PlayerProfileProvider` (in `app/providers.tsx`). Render any clan member's name with `<PlayerNameButton name={rsn} .../>` (or call `usePlayerProfile().openProfile(name)`) and it opens their profile — used in the leaderboard, both activity feeds, the clogs scroller, and the inactivity checker. Prefer this over linking names out to TempleOSRS.

> **Design north-star:** the player profile modal (`player-profile-modal.tsx` + its module CSS) sets the layout/type/hairline/token patterns for the app. The **rank calculator was rebuilt against it** (see below) — match both when adding UI.

## Rank-calculator page structure ("scoreboard + workbench")

The page (`[player]/rank-calculator.tsx`, shared with the readonly moderator view) is one column, not the old three-column card grid. All of its styling lives in **`components/rank-calculator.module.css`** — one module, `--ig-*` tokens only, hairlines + typography rather than card chrome.

- **`CalculatorHero`** (`components/calculator-hero.tsx`) — the scoreboard: rank badge, player name, current → next rank, total points, progress meter, plus the Standard-rank meter for staff structures. Also owns the rank-structure select and the rank-up dialog, and shows the player's **clan standing** chip. `components/player-meta.tsx` renders its footer strip (join date, point scaling) and puts the proof link behind a modal rather than an inline field.
- **`ModerationStrip`** — moderator-only data-source status, replacing the old moderation card.
- **`components/panels/`** — the four category tiles (combat, skilling, collection log & clues, notable items), built from the shared **`Panel` / `PanelField`** primitives in `panels/panel.tsx`. **A tile is a read-only summary** (name, total, completion meter, points remaining) that **opens its inputs in a modal** — you only ever edit one category at a time, and the page is dense enough without four expanded forms. The grid is always evenly divided: 1 up under 640px, 2 up under 1024px, 4 up above. The tile heading wraps the trigger button, which is stretched over the whole card via `.tileTrigger::after`.
- **`ItemList`** — the full-width workbench: every notable item grouped by drop source, in a multi-column grid, with a **sticky toolbar** carrying the search box and a live running total. It owns the search query.

**Rank pace.** `data-sources/fetch-rank-pace.ts` (via `GET /api/rank-pace?name=<rsn>`) returns the player's rank-up history plus, per rank, the **median days the clan spends there** and the **sample size** it came from — a `lead()` window over `player_rank_ups` pairs each promotion with the next one to measure completed stints. `utils/calculators/calculate-rank-pace.ts` dates the current stint from the latest promotion *to* that rank (falling back to join date, flagged via `isFromRankUp`) and **suppresses any median with fewer than `minimumPaceSampleSize` (5) stints behind it**. `components/rank-pace.tsx` renders the time-at-rank field **for Standard structures only** — staff ranks aren't earned on points, so time served says nothing about them. **The clan median is computed but not rendered**: its display lives in `components/clan-median-pace.tsx`, which nothing imports — drop `<ClanMedianPace rank={rank} />` next to `<RankPace />` in the hero to switch it back on. It's parked because the data isn't there yet: as of 2026-08, 172 promotions yield only 34 *completed* stints, just Corporal (6) and Proselyte (5) reach the threshold, and both spread over 0–170 days. The maths and query stay covered by specs so it can come back unchanged. A genuinely comparable "points per day" would need a points-history snapshot table, which doesn't exist yet.

**Clan standing.** `data-sources/fetch-clan-point-distribution.ts` (via `GET /api/clan-point-distribution?exclude=<rsn>`) ships every *other* active member's points; `hooks/use-clan-standing.ts` places the live total against them with the pure `utils/calculators/calculate-clan-standing.ts`. Excluding the player matters — otherwise a live recalculation is ranked against a stale copy of themselves. `topPercent` means "in the top N%", so **smaller is better** (#1 of 100 is `0.01`); there's a spec guarding that direction. Above `exactPositionThreshold` (top 20) the hero shows the exact position, otherwise the percentile.

Three things to preserve when touching this page:
- **The `aria-label`s are the test contract.** Both the Jest specs and the Cypress e2e suite query by label (`total combat points`, `combat points remaining`, `point scaling`, …). Rename a label and you break both.
- **Category inputs live in modals, so tests must open them first.** Jest specs click the tile and await the dialog; the Cypress helper `generateScalingTests` takes an `openCategory` regex for the same reason. Totals stay on the tile, so only per-input assertions need the modal.
- **The player-points write lives in `CalculatorHero` only.** It used to sit inside `useRank`, so every consumer of `useRankCalculator` (hero, nav bar, navigation actions) fired its own duplicate write on each recalculation. `useRank`/`useRankCalculator` are now pure and safe to call anywhere; `useTotalPoints` remains the cheaper option when only the number is needed.

Data-source convention: return `{ success: true, data } | { success: false, error }`; filter to `players.isActive`; `isMaxed = totalLevel === 2376`; pets = `playerAcquiredItems.itemId in AllPetItemIds`; infernal = `tzhaarCape === 'Infernal cape'`.

## Favicon / app icons (App Router gotcha)

Icons come from **file conventions**, not `metadata.icons`: `app/favicon.ico`, `app/icon.png`, `app/apple-icon.png` (all generated from `public/L1.png`). These files **take precedence over any `icons` field in `layout.tsx` metadata** — if the favicon is wrong, it's because a stale `app/favicon.ico` exists, not the metadata. To change icons, replace those files (regenerate from the logo with `sharp`); don't add `metadata.icons`.

## Rank-calculator approvals

`approveSubmission` only auto-handles **Standard** rank structures (assigns Discord roles + messages). **Non-Standard structures (Owner/Admin/etc.) throw and must be handled manually** — there are no Discord rank roles configured for them (`rankDiscordRoles` only covers `StandardRank`).
