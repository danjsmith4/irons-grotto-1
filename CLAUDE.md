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
- **`apps/web/jest.env.ts`** is required by `jest.config.ts` (setupFiles) and **is tracked** — it loads `.env.local` via dotenv, because Next skips `.env.local` when `NODE_ENV=test`. (It used to be untracked, which is why older notes say to create it by hand; it has been committed since `00a3b60`.)
- Server config (`config/constants.server.ts`) parses many env vars at import; `mocks/handlers.ts` imports it, so tests need those vars present in `.env.local`.

## Shipping a change

When the work is done, don't stop at the working tree — branch, push, open a PR, and put it on screen:

```sh
git checkout -b mm/<short-slug> origin/main   # never commit straight to main
git commit -am "<summary>"
git push -u origin HEAD
gh pr create --base main --title "<title>" --body "<what changed, why, how it was tested>"
open "$(gh pr view --json url --jq .url)"     # macOS: opens the PR in the default browser
```

`gh` is installed via Homebrew and authenticated as `mattlm0831`. The PR body should say what was **not** verified as well as what was — e.g. anything behind the Discord auth gate can't be checked headlessly.

## Announcing a change — every PR body needs a member summary

When a PR merges to `main`, `.github/workflows/announce-merge.yaml` posts a note to the clan Discord. It does **not** write that note — it greps the PR body for this block and posts what it finds verbatim:

```markdown
<!-- member-summary:start -->
Your collection log now updates on the leaderboard as soon as you log a new item, instead of waiting for the nightly refresh.
<!-- member-summary:end -->
```

**Include it in every PR.** A PR without the block is skipped with a warning — nothing is announced, and that release is invisible to members. The delimiters are HTML comments, so they don't render on GitHub; only the sentence shows.

### How to write it

This is read by **clan members**, not developers. They do not know what a data source is, they will never open the repo, and they don't care which file changed. One or two sentences, plain language, describing **what is different for them**.

- **Say what they'll notice.** "Player profiles now open instantly" — not "memoised the profile fetch".
- **No jargon, no identifiers.** No file names, function names, table names, library names, or PR/issue numbers.
- **Technical work still gets announced** — framed by its effect, or as general upkeep. A migration, a refactor, a dependency bump: *"Behind-the-scenes upgrades to keep the site fast and reliable."* Vague is fine here; silence is not. **The point is to show the site is actively worked on**, so every merge says something.
- **Present tense, active voice.** "The leaderboard now shows…", not "Added a thing that will show…".
- **Don't oversell.** No "massive", no "revolutionary". Understated reads as competent.

| Instead of | Write |
|---|---|
| Added `player_accomplishments` table + stateless detection hooked into `processPlayerData` | A new Accomplishments feed on the homepage shows milestones as members hit them — inferno capes, collection log milestones and more. |
| Fixed unawaited `db.transaction` in `approve-submission.ts` | Rank approvals now apply reliably every time. |
| Bumped Drizzle, regenerated migrations, added indexes | Infrastructure upgrades to keep things running smoothly. |
| Collapsed the Redis/Postgres split behind a single write path | Your calculator now saves changes automatically as you make them. |

## Drift canary
`app/rank-calculator/utils/notable-item-points-drift.spec.ts` hits the **live wiki** and lists every notable item that currently renders `-`. Run it to see what's broken after wiki drift. (Networked — not a hermetic unit test.) `schemas/wiki.spec.ts` is the hermetic guard for the casing normalisation.

## Testing the point calc
- `calculate-item-points.spec.ts` derives its expectations from a config-driven reference oracle (the `denominator / IM EHB` rule) instead of hard-coded totals, so it stays correct when EHB rates are refreshed. Don't reintroduce magic-number expectations.
- `jest.setup.ts` mocks `next/cache` so `unstable_cache`-wrapped data-sources (`fetchItemDropRates`) run under Jest.

## Known pre-existing test gaps (unrelated to features)
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
- **Infinite scroll everywhere — no "Load more" buttons.** Paginated lists auto-fetch near the scroll end (leaderboard `handleScroll`; `recent-clogs-scroller`'s `onLoadMore` is the other worked example, though that component is not currently rendered — see below).

## Clan data components

The DB stores far more than the leaderboard shows; these surface it (all in `app/components`, data in `app/data-sources`):

- **`ClanStats`** ("Grotto at a glance") ← `fetchClanStats` — aggregate KPIs over active players.
- **`PlayerProfileModal`** — opens over the current window when a player name is clicked. Fetches `GET /api/player-profile?name=` (→ `fetchPlayerProfile`): rank progress vs `rankThresholds`, stat grid, notable-item badges, clue tiers, achievement-diary matrix (`playerAchievementDiaries`, otherwise unused), and rank-up timeline.
- **`RarestDrops`** ("Rarest in the Grotto") ← `fetchCollectionLogInsights` — items the fewest members have logged, from `playerAcquiredItems`.

**Clickable player names, app-wide.** The profile modal is hosted once by `PlayerProfileProvider` (in `app/providers.tsx`). Render any clan member's name with `<PlayerNameButton name={rsn} .../>` (or call `usePlayerProfile().openProfile(name)`) and it opens their profile — used in the leaderboard, the activity feeds, and the inactivity checker. Prefer this over linking names out to TempleOSRS.

> **Design north-star:** the player profile modal (`player-profile-modal.tsx` + its module CSS) sets the layout/type/hairline/token patterns for the app. The **rank calculator was rebuilt against it** (see below) — match both when adding UI.

## Rank-calculator page structure ("scoreboard + workbench")

The page (`[player]/rank-calculator.tsx`, shared with the readonly moderator view) is one column, not the old three-column card grid. All of its styling lives in **`components/rank-calculator.module.css`** — one module, `--ig-*` tokens only, hairlines + typography rather than card chrome.

- **`CalculatorHero`** (`components/calculator-hero.tsx`) — the scoreboard: rank badge, player name, current → next rank, total points, progress meter. Also owns the rank-up dialog, the rank-ladder modal and the account-type prompt, and shows the player's **clan standing** chip plus the game-mode and staff badges. `components/player-meta.tsx` renders its footer strip (join date, point scaling) and puts the proof link behind a modal rather than an inline field.
- **`ModerationStrip`** — moderator-only data-source status, replacing the old moderation card.
- **`components/panels/`** — the four category tiles (combat, skilling, collection log & clues, notable items), built from the shared **`Panel` / `PanelField`** primitives in `panels/panel.tsx`. **A tile is a read-only summary** (name, total, completion meter, points remaining) that **opens its inputs in a modal** — you only ever edit one category at a time, and the page is dense enough without four expanded forms. The grid is always evenly divided: 1 up under 640px, 2 up under 1024px, 4 up above. The tile heading wraps the trigger button, which is stretched over the whole card via `.tileTrigger::after`.
- **`ItemList`** — the full-width workbench: every notable item grouped by drop source, in a multi-column grid, with a **sticky toolbar** carrying the search box and a live running total. It owns the search query.

**Rank pace.** `data-sources/fetch-rank-pace.ts` (via `GET /api/rank-pace?name=<rsn>`) returns the player's rank-up history plus, per rank, the **median days the clan spends there** and the **sample size** it came from — a `lead()` window over `player_rank_ups` pairs each promotion with the next one to measure completed stints. `utils/calculators/calculate-rank-pace.ts` dates the current stint from the latest promotion *to* that rank (falling back to join date, flagged via `isFromRankUp`) and **suppresses any median with fewer than `minimumPaceSampleSize` (5) stints behind it**. `components/rank-pace.tsx` renders the time-at-rank field. **The clan median is computed but not rendered**: its display lives in `components/clan-median-pace.tsx`, which nothing imports — drop `<ClanMedianPace rank={rank} />` next to `<RankPace />` in the hero to switch it back on. It's parked because the data isn't there yet: as of 2026-08, 172 promotions yield only 34 *completed* stints, just Corporal (6) and Proselyte (5) reach the threshold, and both spread over 0–170 days. The maths and query stay covered by specs so it can come back unchanged. A genuinely comparable "points per day" would need a points-history snapshot table, which doesn't exist yet.

**Clan standing.** `data-sources/fetch-clan-point-distribution.ts` (via `GET /api/clan-point-distribution?exclude=<rsn>`) ships every *other* active member's points; `hooks/use-clan-standing.ts` places the live total against them with the pure `utils/calculators/calculate-clan-standing.ts`. Excluding the player matters — otherwise a live recalculation is ranked against a stale copy of themselves. `topPercent` means "in the top N%", so **smaller is better** (#1 of 100 is `0.01`); there's a spec guarding that direction. Above `exactPositionThreshold` (top 20) the hero shows the exact position, otherwise the percentile.

**Edit player is a modal on a route.** `players/edit/[player]` has to stay a route — `fetchPlayerDetails` redirects to it when a player's name stops resolving — but it renders as an always-open dialog using the same `rank-calculator.module.css` modal chrome as the category panels and the account-type prompt. Dismissing it navigates to `/dashboard`, same as its Back button. There is deliberately **no "Edit player" entry in the nav bar**: from inside the calculator a changed name already redirects you there. The pencil in `player-list.tsx` stays, because that list disables the calculator link for an invalid name and would otherwise strand the player.

### The sheet is preloaded, not fetched on the click

`fetchPlayerDetails` is the most expensive read in the app — a hiscores check, a TempleOSRS `add_datapoint` push, then WikiSync / Temple stats / Temple collection log / Discord roles in parallel, then the write-back. It used to be `await`ed inside `[player]/page.tsx`, so every visit paid all of it *after* the click with nothing on screen but `loading.tsx`.

That work does not get cheaper by being deferred, so it is started earlier instead. It now runs behind **`GET /api/player-details?name=`** and is read from the browser's React Query cache, which is a module singleton and therefore survives soft navigation:

| | |
|---|---|
| `app/player/hooks/use-player-details.ts` | the query key, its options, and `patchPlayerDetailsCache` |
| `app/components/preload-calculator-data.tsx` | mounted on `/dashboard`; warms the sheet for each of the viewer's accounts |
| `[player]/calculator-loader.tsx` | reads the cache, renders the skeleton or mounts `FormWrapper` |

- **The page component still runs server-side, and still hydrates `['drop-rates']` and `['items']`.** Those two are `unstable_cache`d and shared by every player, so they are genuinely cheap there — and `useDropRates` / `useGetItems` call the server functions directly and would break without the seeding. Don't remove the `HydrationBoundary`.
- ⚠️ **Autosave patches the cache** (`patchPlayerDetailsCache`, spec'd). A fresh cache entry is served without a refetch, so a write that did not reach it would hand the member back a snapshot from before their own edit. Invalidating instead would be worse: the calculator is an active observer, so marking the query stale mid-edit refetches — a full Temple sync per 800ms autosave.
- ⚠️ **A stale cache hit waits like a cold one.** `useForm` reads `defaultValues` once, so anything mounted from a stale snapshot is never corrected. `CalculatorLoader` mounts the form only while the data is fresh, and latches once it has — the form owns the member's in-progress edits from then on and must never be unmounted for a loading state.
- **Nothing refetches behind a mounted form** (`refetchOnWindowFocus` / `refetchOnReconnect` off), for the same reason: it could not change anything on screen, and would spend another Temple datapoint to do it.
- **The preload is sequential and uses `prefetchQuery`.** One datapoint per account against Temple's ~10/min, and a no-op while the data is still fresh — so bouncing between the dashboard and the sheet does not re-run the sync.
- ⚠️ **The name-no-longer-resolves redirect is now data.** `fetchPlayerDetails` answers that case with `redirect()`, which a route handler would turn into a 307 and an HTML body; `app/api/player-details/route.ts` catches it by digest and returns `redirectTo`, which the loader navigates.

Three things to preserve when touching this page:
- **The `aria-label`s are the test contract.** Both the Jest specs and the Cypress e2e suite query by label (`total combat points`, `combat points remaining`, `point scaling`, …). Rename a label and you break both.
- **Category inputs live in modals, so tests must open them first.** Jest specs click the tile and await the dialog; the Cypress helper `generateScalingTests` takes an `openCategory` regex for the same reason. Totals stay on the tile, so only per-input assertions need the modal.
- **Nothing on the client writes points.** `useRank` / `useRankCalculator` / `useTotalPoints` are pure — the running total they produce is for display only, and `useTotalPoints` remains the cheaper option when just the number is needed. `players.points` is recalculated server-side by `calculatePlayerPoints` (`app/rank-calculator/utils/calculate-player-points.ts`) inside `processPlayerData`, from the stored record, and that is the only place it is written. Don't reintroduce a client-side write: the previous one posted to an **unauthenticated** action taking `(playerName, points)`, so the leaderboard was whatever the client last claimed, for whichever player it named. If `calculatePlayerPoints` throws (it needs live wiki drop rates) the stored total is left alone — stale is a cosmetic lag, zero would be a catastrophe.

### Feeds on the homepage and dashboard

Three activity feeds sit in one `auto-fit` grid (`minmax(320px, 1fr)`, gap 2rem) on both pages: **Rank Ups**, **Accomplishments**, **Collection Log**. Three across when there's room, collapsing to two then one with no breakpoint arithmetic. Grid's default `align-items: stretch` keeps the cards level, which the fixed `max-height: 420px` on `.list` in `activity-feed.module.css` already assumes. Accomplishments renders conditionally — with nothing to show it would leave an empty grid cell, and a column of whitespace reads worse than two columns.

**"Your Latest Collection Logs" is deliberately not rendered.** `RecentClogsContainer` / `recent-clogs-scroller` / `fetchUserRecentClogs` / `GET /api/user-recent-clogs` all still exist and work — they were unmounted from the dashboard on member feedback, because showing someone their own recent clog items duplicates the collection log in game exactly. The clan-wide **Collection Log** feed is a different thing and stays: other members' drops aren't visible in game.

Data-source convention: return `{ success: true, data } | { success: false, error }`; filter to `players.isActive`; `isMaxed = totalLevel === 2376`; pets = `playerAcquiredItems.itemId in AllPetItemIds`; infernal = `tzhaarCape === 'Infernal cape'`.

## Pets are counted in one place and scored in another

Adding a pet means **two independent edits**, and neither implies the other. Membership isn't even symmetric: **Beef** is counted but scores nothing (Brutus isn't in the item list at all), and a scored pet added only to a category counts for nobody.

- **The count** is `AllPetItemIds` (`app/schemas/osrs.ts`) — item ids, read by `fetch-leaderboard`, `fetch-clan-stats` and `fetch-player-profile`. ⚠️ It mirrors TempleOSRS' `all_pets` **by hand**, and a pet missing from it is not an error anywhere — it silently undercounts every member who has it. Diff it against `https://templeosrs.com/api/collection-log/categories.php` → `other.all_pets`, with `collection-log/items.php` to name the ids.
- **The points** are the notable-item list. A **skilling pet is not a boss drop** — the `add-osrs-content` skill covers only the boss/EHB/drop-rate path. Skilling pets live in `data/item-categories/skilling-pets.ts` on `collectionLogCategory: 'all_pets'`, with **preset** points from `calculateXpOrTimeBasedItemPoints(petEhcRates[name])`. `buildNotableItemList` returns early on any item that already has points, so these never hit the wiki and never drift to a red `-` — but the hours are ours to justify, so comment where they came from. Temple's published EHC covers established pets; anything recent has to be calculated from the wiki's drop rate ÷ actions per hour.

⚠️ **The collection-log match is by name, and the name is Temple's, verbatim.** `stripEntityName` only removes `'` and `.`, so `CollectionLogItemName` has to carry Temple's exact casing. Check `collection-log/items.php` rather than the wiki — the two drift apart (the wiki renamed `Mr mcgroot` → `Mr McGroot` in August 2026). This is the pet-side twin of the `DroppedItemResponse` re-casing above.

## Accomplishments feed

The third activity feed, alongside rank ups and collection log — the notable things a member does that are not a promotion and not a single drop. It runs **full width above** the other two on both the homepage and the dashboard.

`player_accomplishments` (migration `0019`) is one row per thing achieved. Four files, one job each:

| | |
|---|---|
| `app/schemas/accomplishments.ts` | the `AccomplishmentType` enum (mirrors `accomplishmentTypeEnum`), plus its labels and **wiki-image icons** |
| `config/accomplishments.ts` | the numbers — `milestoneThresholds`, which CA tiers count, the feed size |
| `app/utils/detect-accomplishments.ts` | pure: a snapshot in, the accomplishments it qualifies for out |
| `lib/db/accomplishment-operations.ts` | `syncPlayerAccomplishments` — loads the snapshot, writes what's new |

**Detection is stateless, and that is the whole design.** `detectAccomplishments` reports everything a player *currently* qualifies for — never "what changed" — and every row is inserted `on conflict do nothing` against `(player_name, accomplishment_key)`. Nothing has to diff against the last run, so re-running is free and a **missed run is caught up rather than lost**. Two consequences to keep in mind:

- **`accomplishment_key` is the identity and must stay stable.** Never build it from a label or a live count. Renaming a key re-announces the accomplishment to everyone.
- **Lowering a threshold in `milestoneThresholds` retroactively announces it** for everyone already past it. Raising or removing one is safe. Treat the list as append-only in practice.

A player crossing several thresholds at once earns **all** of them (1,100 clog slots → 100/250/500/750/1000), and Grandmaster CAs earn Master too. That is deliberate and follows from statelessness.

⚠️ **The feed shows at most one row per `(player, achieved_at)`.** Detection stamps everything found in one run with a single timestamp, so a member tracked for the first time — or syncing Temple after a long gap — lands a burst of rows sharing one `achieved_at`. `fetchRecentAccomplishments` uses a CTE with `row_number()` over that group and keeps only rank 1.

**One, not a cap.** A cap makes the artefact unlikely; the window function makes it impossible, which is the property wanted — a burst showing "100 / 250 / 500 efficient hours played" together is not an achievement, it is visibly a first sync, since nobody earns all three in the same instant. Which row survives is decided inside the window: one-off feats (null `value`) ahead of threshold milestones, then the highest threshold, then `id` so the feed doesn't reshuffle between requests.

Two earlier designs were tried and dropped. Hiding a player's whole first pass behind an `is_backfilled` flag discarded real accomplishments and did nothing for the case that *isn't* a first pass — an existing member syncing after a year away. A cap of five still let one member's burst fill half the feed with consecutive milestones. Don't reintroduce a tunable count: a constant at 1 is an invitation to raise it.

**When it runs.** `processPlayerData` calls it after the player record is written (it reads that record, not a live API), so the batch `GET /api/update-all-players` and every calculator save both cover it — no new endpoint. The call is wrapped in its own try/catch: a member's stats landing is the point, and noticing what they add up to can wait for the next run.

**Icons come from the type**, resolved as OSRS Wiki image names through `formatWikiImageUrl` exactly like clog items (`ItemImageWithFallback` degrades to an avatar if the wiki renames one). There is no per-row icon override — the type is the whole presentation decision.

**Pets are not accomplishments.** Every pet is a collection log slot, so it already appears in the collection-log feed alongside every other drop; announcing it again in a second feed on the same page adds nothing. Spec'd in `detect-accomplishments.spec.ts` so it doesn't get re-added by accident.

**Accomplishments follow the player.** `deletePlayer` deletes them and the rename path in `edit-player-action.ts` moves them; miss the rename and the next pass treats the player as brand new and re-earns the lot.

Mains are included — this is not the ladder. There is **no EHC milestone**: nothing stores efficient-hours-collected per player (`petEhcRates` is points config, not a player stat), so there is no data to detect it from.

## Favicon / app icons (App Router gotcha)

Icons come from **file conventions**, not `metadata.icons`: `app/favicon.ico`, `app/icon.png`, `app/apple-icon.png` (all generated from `public/L1.png`). These files **take precedence over any `icons` field in `layout.tsx` metadata** — if the favicon is wrong, it's because a stale `app/favicon.ico` exists, not the metadata. To change icons, replace those files (regenerate from the logo with `sharp`); don't add `metadata.icons`.

## There is no "save"

The calculator persists edits as they are made. There is no Save button, no "Saved ✓", no success toast — an edit applying and staying applied is the expected case and does not need reporting. **Do not reintroduce a save affordance**, including a passive one: an indicator that says "saved" implies a step that no longer exists.

- `hooks/use-autosave.ts` — watches the form, debounces 800ms (so ticking twenty items lands as one request), flushes on tab hide and before a rank submission. `buildPlayerPatch` is pure and spec'd separately.
- `[player]/actions/update-player-state-action.ts` — takes a **partial** patch. Its schema is a `pick` of `RankCalculatorSchema`: stats, `rank` and `points` are absent by construction, so the browser cannot assert them. The old `saveDraftRankSubmissionAction` took the whole form, which is why every page load rewrote every field.
- `updatePlayerEditableFields` (`lib/db/player-operations.ts`) — the write. Only supplied keys are touched.

The **only** UI is on failure: a toast when a write does not land, because that is the one thing the player could not otherwise know.

"Apply for promotion" no longer checks `isDirty` or tells anyone to save first. It awaits a flush — the question was never "is the form dirty", it was "is what I am about to submit what they can see".

**"Apply for promotion" is the nav bar's primary button**, not a menu item. Removing Save left its attached chevron anchored to nothing — a caret with no button in front of it — so the page's one real action took the slot, and the two remaining calculator actions (Reset form defaults, Delete data) moved into the existing `⋯` overflow menu under a "This calculator" label. There is no split control any more; don't rebuild one. The button is solid green **only when `isRankUp` says a promotion is actually waiting**, and then it names the rank ("Apply for Sergeant"); otherwise it is a hairline ghost, because re-applying at a rank you already hold is not the thing to draw the eye. It stays clickable for mains and explains — see `canApplyForRank` above. `NavBar`'s prop is `showCalculatorActions` (it was `showSaveActions`; nothing here saves).

**The Redis draft is gone.** `userDraftRankSubmissionKey`, `saveDraftRankSubmissionAction` and the page-load rewrite that called it on every visit are all deleted. A submission snapshot is now written from the player record rather than `COPY`'d from the draft, and `fetchPlayerDetails` lost its `mergeSavedData` parameter — it chose between two stores, and there is only one.

⚠️ **The submission diff needs the *unblended* source values.** `fetchPlayerDetails` returns values with the player's claim already merged in (a claim wins where it outruns what a source can see), which is right for display and points — but the moderator diff exists to show where a claim outruns its evidence, and comparing a blend against itself can only report agreement. `PlayerDetailsResponse.sourceValues` carries the raw source-computed values for exactly the diffed fields, and `publish-rank-submission-action` compares stored claim against that.

This was briefly broken: extending `currentDbValues` to cover `hasBloodTorva` / `hasDizanasQuiver` / `hasAchievementDiaryCape` (the fix for a quiet source wiping them) also made the "fresh" side of the diff fall back to the stored claim, so an unverified claim stopped being flagged — and `approveSubmission` grants Discord roles off `!hasBloodTorvaDiscrepancy`. Don't collapse `sourceValues` back into the blended fields.

**"Delete data"** no longer deletes a draft — it clears the player's *claims* (`resetPlayerClaims`): the manual flags, the proof link, every item override. Stats, diaries and the stored collection log are left, since a source re-derives those on the next sync anyway.

## Source-derived items live in `player_derived_items`

**Anything a data source derives about a player that no other table records goes in `player_derived_items` (migration `0023`). Do not add a new home for it, and do not leave it unstored.** `lib/db/derived-item-operations.ts` is the whole surface.

Every notable item bar six is a collection log slot, so `player_acquired_items` already keeps a durable copy that survives a source going quiet. Six are not — the four quest items (**Barrows gloves**, **Book of the dead**, **Quest cape**, **Mage Arena 2 cape**), the one combat-achievement item (**6 Jads**) and **Music cape**, together worth **480 points**. They are settled purely by a live WikiSync read, and until `0023` they were stored nowhere: recomputed on every sync and forgotten in between.

That made them the one part of the calculator with **no floor under it**. `currentDbValues` protects the scalar equivalents on the principle that an unreachable source says *nothing*, not "no" — these six could not have that protection, because there was no previous answer to fall back to. A WikiSync outage therefore subtracted up to 480 points from a member's stored total and left no record they had ever had it.

⚠️ **`is_acquired` is a boolean and the row's absence is a third state.** No row means the source has never been read for that item; `false` means it was read and said no. **Collapsing those two is the bug the table exists to fix — never treat a missing row as a negative.**

- `getSourceDerivedItemNames` (`app/rank-calculator/utils/`) derives the set from the item list (`!isCollectionLogItem`) rather than naming it, so a new `questItem` or `manualItem` is picked up automatically. Its spec asserts the current six, so **adding one fails the suite on purpose** — that is the reminder the new item needs a home here too.
- `resolveDerivedItemWrite` owns the decision **not** to write after a failed read, returning `null`. The guard is a spec'd function rather than an `if` at the call site, because an `if` is one careless edit from deletion and the damage is silent. Don't reintroduce a call-site condition.
- `getDerivedItems` **fails soft**, returning `{}` on error. It sits on the calculator's load path, and a safety net that can take down the page it protects is worse than no net.
- Rows **follow a rename** (`edit-player-action.ts`) and go with a **deleted player** (`deletePlayer`). `resetPlayerClaims` deliberately leaves them: they are what a source reported, not a claim.
- Reads are `??` never `||` — a stored `false` is a real answer and must not fall through to the next source.

Consumers: `fetchPlayerDetails` uses it as the floor when WikiSync is quiet, and `fetch-player-comparison` reads it so two members can be scored from the database without a live round-trip each. With it in place the comparison ledger reconciles to `players.points` exactly, which is why that view carries no "unaccounted points" disclosure.

## Submissions live in Postgres

`rank_submissions` (migration `0022`) replaced three Redis keys per submission — the snapshot, a metadata hash and a diff hash. `lib/db/submission-operations.ts` is the whole surface.

- **Snapshot and diff are versioned `jsonb`**, parsed with the pinned `RankSubmissionSnapshotV1` (`app/schemas/rank-submission-snapshot.ts`) rather than the live `RankCalculatorSchema`. That distinction is load-bearing: the moderator view used to cast the stored blob to the live schema, so the next change to the calculator's shape would have made every historical submission parse wrong. **When the form changes, add a `V2` — don't edit V1.**
- The four data-source flags **are** real columns: `approveSubmission` branches on them and together they are the auto-approval predicate (`isAutoApprovable`, spec'd).
- `discord_message_id` is a `varchar`. Postgres won't coerce a snowflake to a number, which is why **`redisRaw` is deleted** — that second client existed solely for this.

⚠️ **Approval claims the row before touching Discord.** `approveRankSubmission` does `SELECT … FOR UPDATE` on a pending row, then moves the rank and writes the rank-up in the *same* transaction; Discord runs only after it commits. Previously the status check was a plain read, and every Discord side effect ran first — so two moderators clicking within a second of each other both assigned roles and both DM'd the member. Whoever loses the race now gets null and stops. `rejectSubmissionAction` does the same via `claimRankSubmission`.

**The rank comes from the row, not the caller.** `approveSubmission` no longer takes a `rank` argument — it reads what was recorded when the member applied. Submissions backfilled out of Redis have none (it lived only in the Discord embed), so they refuse automatic approval and say so.

Discord failure after a commit is **reported, not rolled back** — `{ success: true, discord: 'synced' | 'failed' }` — matching the staff-role convention.

## Rank-calculator approvals

`approveSubmission` assigns Discord roles and messages the submitter for every approval. There is one rank ladder, so there is no longer a structure to branch on (`rankDiscordRoles` covers every `StandardRank`).

## Account type (game mode) — read before touching ranking

There is **one** points ladder (`rankThresholds` in `config/ranks.ts`). The only thing that diverts a player off it is being a **main**, who is sorted into the single main-account rank (`mainAccountRank`, Looter) whatever their points. `rankThresholdsFor(accountType)` is the whole rule; an unresolved (null) type gets the ironman ladder, because this is an ironman clan and the main rank must never be applied on a guess.

`players.account_type` (enum, **nullable**) holds the mode; `players.gim_group_name` records the group a GIM was verified against. **Null means unresolved, and is exactly what raises the blocking prompt** — it is not a missing-data bug.

### Mains are members — they are just not ranked

**Signup does not turn mains away, and no gate should be reintroduced there.** The calculator is a personal progress tracker and everyone gets one; the account type is resolved and recorded, not used as a bouncer. What a main cannot do is enforced where it actually happens:

- **Apply for a rank.** `canApplyForRank(accountType)` in `config/ranks.ts` — approval assigns a real in-game and Discord clan rank off the ironman ladder. Enforced server-side in `publish-rank-submission-action.ts` (the client is not what decides who gets a rank), with the UI matching: no rank-up dialog in `calculator-hero.tsx`, and "Apply for promotion" in `nav-bar.tsx` explains rather than silently disabling.
- **Place in the clan rankings.** `rankedMember` in `lib/db/player-filters.ts` — used by `fetch-leaderboard`, `fetch-clan-point-distribution` (a main in the pool shifts every ironman's percentile) and `fetch-clan-stats`.

Mains **do** appear in the activity feeds, `fetch-collection-log-insights` ("Rarest in the Grotto") and player profiles. They are in the clan; they are just not on the ladder.

⚠️ **The exclusion must keep nulls.** `rankedMember` uses `account_type IS DISTINCT FROM 'main'`, not `<> 'main'`: in SQL `NULL <> 'main'` is NULL, not true, so a bare inequality would silently drop every member whose game mode is still unresolved — the exact accounts the prompt is chasing. Spec'd in `player-filters.spec.ts`.

Because a main is now a real outcome rather than a rejection, **neither account-type picker pre-selects one** (`add-player-form.tsx`, `account-type-dialog.tsx`): a stray Confirm would pin the account to `mainAccountRank` and off the leaderboard. Unanswered stores null, and the calculator asks properly.

**Why it cannot simply be derived.** `resolveTempleAccountType` (`app/schemas/temple-api.ts`) returns null whenever Temple says *main*, and that is deliberate:

- Temple's `Game mode` (0 main / 1 IM / 2 UIM / 3 HCIM) is read off the individual hiscore boards and is sound.
- Temple's `GIM` field (0, 12–15 regular groups of 2–5, 22–25 hardcore) is **opt-in**: Temple only links a group once *every* member is tracked on Temple individually. A ranked group ironman Temple has never heard of comes back as `Game mode 0 / GIM 0` — identical to a real main. Verified 2026-08-20: `WhoKnowSteve` of `drippybros`, a group listed on the ranked group hiscores, still reports 0/0 after a forced `add_datapoint.php`.
- Nothing else can close the gap **for a group ironman**. They appear on **no** individual ironman board (confirmed against a random ranked group), the Jagex group boards have **no player→group lookup** (`user1`/`player`/`member` are ignored; only `groupName` searches, and there is no JSON anywhere), unranked GIM groups are excluded from the hiscores entirely by design, WiseOldMan reports both as `regular`, and WikiSync's manifest does not collect varbit `1777` (the client-side account type, where `6` = unranked GIM). **Temple closes it as soon as the group is on Temple's GIM tracking**, which is a thing the player can go and do — so they are asked to, rather than the app scraping Jagex behind their back.

So a `main` reading is the *absence* of an answer, and the player is asked.

**Three concerns, composed — never nested.** These were tangled once and it cost a total signup outage, so keep them apart:

| | question | lives in | side effects |
|---|---|---|---|
| **A** tracking | does Temple know this account? if not, register it | `data-sources/ensure-tracked-on-temple.ts` | yes (`add_datapoint.php` + a ~10s re-poll) |
| **B** account type | what game mode is this? | `utils/resolve-account-type.ts` | none — takes the Temple record as an **argument** |
| **C** declaration | the player told us; confirm it | `utils/resolve-declared-account-type.ts` | registers on Temple, then re-reads Temple |

A may improve B's future answers, but **B must not drive A, and A must not return an account type**. `resolveAccountType` never infers `main` (that's the absence of an answer), and a spec asserts it triggers no `add_datapoint.php`.

**TempleOSRS is the only source of game mode.** There is no hiscores fallback, and reintroducing one is a mistake. A `data-sources/fetch-hiscores-account-type.ts` probe of the ironman boards used to sit behind Temple, and the Jagex *group* boards used to verify a declared group. Both are deleted, because neither changed any outcome that matters: **`rankThresholdsFor` branches on nothing but `isMainAccount`**, so ironman, HCIM, UIM and all three GIM variants score on the identical ladder. The hiscores were deciding a *badge*, at the cost of a second source of truth that could disagree with Temple. The one hiscores call that remains is `players/validation/player-validation.ts`, which only asks whether a name exists — that predates this and is not a game mode.

**Never read "not on Temple" as an answer.** A 402 means nobody ever asked Temple to look. `ensureTrackedOnTemple` registers the account and re-polls; signup shows this happening rather than hiding it (`templeState` in `add-player-form.tsx`). It matters beyond game mode — every stat the calculator scores comes from Temple, so an untracked member has nothing to be scored on.

⚠️ **`fetchTemplePlayerStats` must request `bosses=1`, which is why it has no `bosses` parameter.** `player_stats.php?bosses=0` omits thirteen fields `TempleOSRSPlayerStats` requires (`info.Primary_ehb`, the EHB totals, `Collections`, `TzKal-Zuk`, every `Clue_*`), so the parse can only throw and the catch turns it into a silent null. That null was read as "Temple doesn't know this player" and then as *main* — rejecting **every** ironman at signup, and wiping `account_type` on every rename. Guarded by `fetch-temple-player-stats.spec.ts`. Want only a game mode? Use `fetchTemplePlayerInfo`.

**Batch population.** `GET /api/update-all-players` syncs every player's game mode via `syncPlayerAccountType` before its usual heavy refresh — one cheap `player_info.php` call each, on the loop's existing 6s rate-limit delay, plus a registration for anyone Temple has never seen (Temple allows ~10 datapoints/min, which is exactly that cadence). It only ever *fills in* a type: it never writes `main` on Temple's say-so, and never overwrites an answer a player has already given. The response reports `accountTypesResolved` and `playersNeedingAccountType`, the latter being exactly who the prompt will catch. Run it after migrating so most players never see the dialog.

**The prompt.** `components/account-type-dialog.tsx` renders unskippable on calculator load whenever `accountType` is null — except in the readonly moderator view, which is gated on `formState.disabled` (that form belongs to whoever is reviewing, not the account's owner). Signup asks the same three-way question inline, and only when needed: `add-player-form.tsx` probes `fetchAccountTypeAction` as the name is typed and stays quiet when the account resolves. That probe deliberately does **not** register on Temple (it runs per keystroke); the form calls `addToTempleAction` for that when the probe reports `isTrackedOnTemple: false`, so the wait is visible. The debounce is memoised and replies are matched against the latest typed name — built inline it debounced nothing and a stale reply could re-answer for an earlier name.

**A claimed group is confirmed with Temple, not with the hiscores.** `resolveDeclaredAccountType` calls `ensureTrackedOnTemple` (registering the account if Temple has never seen it) and then reads Temple's per-player `GIM` field — 12–15 regular, 22–25 hardcore. Verified live 2026-08-22: `FriccKip` of `friccnhecc`, a group **on Temple's GIM tracking**, reports `Game mode 0 / GIM 12`; `WhoKnowSteve` of `drippybros`, whose group is **not** tracked, reports `0 / 0` — indistinguishable from a main. So the group being tracked on Temple is the whole condition. **A miss is never quietly downgraded to unranked.** It returns `{ status: 'group-not-tracked' }` and writes nothing; the dialog stays open with a callout saying the group is not tracked yet and linking to `clientConstants.temple.gimTrackingUrl` (`https://templeosrs.com/gim/tracking.php` — **not** `leaderboards.php`, which only lists groups Temple already tracks and so is the last page that helps someone missing from it) to go add it, then press Confirm again. It is always rendered as a real link, never pasted into an error string: a validation message renders as plain text, leaving the player to select and copy an address. That URL lives in `config/constants.client.ts` rather than beside the resolver, because the resolver is a `'use server'` module and a client component needs the link — every export of a `'use server'` file has to be an async function, so a plain `export const` there fails the build. Signup does the same via a validation error on `gimGroupName`. `gimGroupName` is now the player's own label, not a verified fact — Temple settles the *mode* and nothing needs the name to do it. Only unranked GIM rests on the player's word, because it is published nowhere, and they have to choose it on purpose.

Badges: `app/components/account-type-badge.tsx` renders the in-game chat badge from the wiki. Mains have no badge in game and get none here; an unresolved account shows nothing either. Where the missing badge would shift the text after it, reserve the space instead of substituting a filler icon — the leaderboard wraps it in a fixed-width `.badgeSlot` so every name starts at the same x.

## Staff roles

Staff standing is **metadata on a player, not a rank**: `players.staff_role` (enum, nullable — moderator / admin / deputy_owner / owner). Staff are ranked on points like everyone else. `app/components/staff-badge.tsx` renders the role using the matching in-game clan rank's icon and name (`staffRoleRanks`), and appears in the calculator hero, the player-profile modal and the leaderboard — in the leaderboard as an icon **trailing** the name (`iconOnly`), never a new column and never in front of the name — only a handful of members are staff, so a leading badge pushed just those few names off the column's shared left edge. The account-type badge does still lead the name, because nearly every member has one.

This replaced the old `RankStructure` concept (a user-selectable Standard/Main/Admin/Moderator/Owner dropdown that switched which rank table applied). Don't reintroduce it.

## Clan events — SOTW / BOTW

The clan runs a TempleOSRS competition a week, alternating **Skill of the Week** and **Boss of the Week**. `/admin`'s **Events** pane (the default) creates them; a nav-bar indicator shows the one running.

**The only decision a moderator makes is the skill or the boss.** Everything else is a rule, and the rules are enforced server-side in `create-clan-event-action.ts` — the form's copy of them is only what it draws:

| | rule | lives in |
|---|---|---|
| type | alternates; never chosen | `nextClanEventType` (`config/clan-events.ts`) |
| dates | Friday 14:00 UTC → the next Friday 10:00 UTC | `nextClanEventWindow` (`app/utils/clan-event-schedule.ts`) |
| entrants | linked group + `group-sync`, never a pasted list | `create-temple-competition.ts` |
| how many | one queued beyond the one running | `getUpcomingClanEvent` |

Those fields are still **rendered, locked** (`.lockedValue` — dashed hairline, not a disabled input): they are decisions already made, and staff should see what is about to be booked without opening Temple. The client sends `expectedType` alongside the metric so a form left open since before the last event was created is rejected rather than silently creating the wrong kind.

### Creating a competition — two things Temple's docs do not say

Both were found by calling the endpoint, and both broke it:

- ⚠️ **`team-comp` must be absent, not `0`.** Temple checks whether the parameter is *present*, not what it holds, so `team-comp=0` routes the request down the **team** path and fails with `Invalid memberlist JSON!` — it is looking for `teams`. This is what broke the first real attempt to create an event.
- ⚠️ **`participants` is required even with a linked, synced group.** Omitting it or sending `[]` fails with `Invalid memberlist!`. So `fetchTempleGroupMembers` sends the group's own roster — the only list that cannot introduce a non-member. Temple then applies the sync over the top: sending 268 names produced a 278-participant competition. **The list we send does not decide who competes**; do not "improve" it into a curated set.

⚠️ **Temple rewrites the name it stores.** "Zulrah BOTW" is kept as `Zulrah Botw` (title case, punctuation flattened). The row records what Temple stored (`storedName`, read back after creation), not what was sent, or the site would show members a name that does not match the competition page.

`competition_delete.php` takes `id` + `key`, which is what makes this endpoint safe to test live — create, verify, delete.

**After creating, the competition is handed to the clan Discord bot** (`announceClanEvent`): `.sotw <url> <key>` / `.botw <url> <key>` into `clanEventAnnouncementChannelId`. That is the bot's syntax, not ours — it is a command, not a human announcement. ⚠️ **The message carries the edit key**, so anyone who can read that channel can edit or delete the competition. Failure is reported, not rolled back (`discord: 'sent' | 'failed' | 'skipped'`), matching the staff-role convention.

**`clan_events.id` is Temple's competition id** (migration `0024`). A row only ever exists because a competition exists, so Temple is called *first* and the row is written from its reply — the reverse order leaves a row pointing at nothing whenever Temple refuses. `competition_key` is the edit password Temple hands out **once**; it is stored or it is gone. Standings are never stored: they are read live from `competition_info.php`, which is public.

⚠️ **Temple's dates carry no timezone** (`2026-08-21 14:00:00`, server time UTC) and V8 reads that form as *local*. `parseTempleUtcDate` in `app/schemas/clan-events.ts` normalises at ingestion; `starts_at`/`ends_at` are `timestamp with time zone`, unlike the older tables here, because an event *is* an exact instant.

⚠️ **`xp_gained` is Temple's name for it whatever the competition tracks** — for a boss week it is kill count. Parsed as `gained` so nothing downstream pretends a Vorkath kc is experience; `clanEventGainLabel` supplies the unit.

**Metric ids are Temple's, and are recorded rather than derived.** Skills happen to match the OSRS hiscore order (Thieving 18); boss numbers are Temple's alone. Skills and bosses share **one id space**, which is what lets `clanEventTypeForMetric` classify an imported competition from its metric with nobody having to say which kind it was.

⚠️ **A metric missing from these lists fails quietly and twice**: the event renders no icon, *and* `clanEventTypeForMetric` cannot classify it, so importing that competition is refused outright. This bit — the first BOTW backfilled was Maggot King (122), which had been left out. When Temple adds content, add it here.

Icons are wiki file names **verified to resolve**, not derived from the name — several have no article image under their own name (Zulrah is `Zulrah_(serpentine)`, Wintertodt is `Burnt_page`, Grotesque Guardians is `Dusk`, Shellbane Gryphon is `Shellbane_gryphon` with a lowercase g). Don't "simplify" them into `name.replaceAll(' ', '_')`; check a new one against `https://oldschool.runescape.wiki/images/thumb/<name>.png/64px-<name>.png` first. The picker renders them as a **searchable grid of icon tiles**, not a dropdown — a native `<select>` cannot show an icon, and staff recognise a boss by its face.

**Skill of the Week excludes the six combat skills** (`combatSkillMetricIds` — Attack, Strength, Defence, Ranged, Magic, Hitpoints). A skilling competition on a combat skill is a bossing competition with worse scoring, and Hitpoints cannot be trained alone; combat belongs to BOTW. Spec'd so it cannot drift back.

**Import bootstraps the alternation.** The next type follows the last event *recorded*, and the clan ran these long before there was a table — so `importClanEventAction` adopts an existing competition by id, reading its name, dates and type from Temple. Without one imported event, the first creation would guess.

**Wins.** `clan_event_wins` is keyed on `(event_id, player_name)`. `syncClanEventResults` is stateless in the same way accomplishment detection is: it asks Temple for finished events with no winner recorded and writes what is missing, so re-running is free and a missed run is caught up. It runs off the two page loads that already read event data (the admin pane, the status endpoint) — there is no cron. A win is only recorded for a **tracked member** (`resolveClanPlayerName` matches case-insensitively), because the linked Temple group can contain accounts this site has never seen, and an all-zero table crowns nobody.

**Who sets it up — "Pick staff".** Staff kept forgetting whose turn it was, so the pane rolls one for them. `pickEventDutyStaff` (pure, spec'd) draws from the **elevated** accounts — the only ones who can reach `/admin` and therefore act on it — and **excludes whoever is already on duty** so that pressing the button again actually rerolls; with a handful of staff a plain random pick lands on the same person too often to look deliberate. A pool of one keeps them.

The assignment lives in **`sync_metadata`**, whose `value` column (migration `0025`, nullable) was added for it — that table is the singleton-bookkeeping store, and this is one row that needs to remember *what* as well as *when*. It is **keyed to the slot it was rolled for**: once the calendar moves past it, the assignment is spent and the pane offers a fresh roll, rather than showing a name against an event that has already happened.

`buildEventDutyMessage` (pure, spec'd) is what lands in `clanEventDutyChannelId`. It carries the deadline, the event type and who to ask for the pick — **including when that person has left the clan**, which would otherwise be a dead end for whoever was just volunteered. The jokes are free; the facts are on their own lines so they survive being skimmed.

⚠️ `getClanEventDuty` **never throws**. `fetchClanEvents` turns any exception into a pane showing nothing but an error, and whose turn it is is the least important thing on it — so an unreadable record (or a deploy that lands ahead of `0025`) reads as "nobody on duty" instead of taking event creation down with it.

**Who picks.** The clan's rule is that the next event's skill or boss is chosen by **the last winner of that same event type** — a boss week's boss comes from whoever won the previous *boss* week. `selectClanEventPicker` (pure, spec'd) is the rule; the create pane names them.

⚠️ **Not "last week's winner".** This was written that way first and it is wrong: the two types alternate, so whoever is winning the event running right now is playing the *other* type and picks the *other* type. For the same reason there is no "current leader" fallback — the type being created is never the type running, so a running event has nothing provisional to offer. Only finished events with a recorded winner count.

**Winners leave.** A third of the roster is `is_active = false`, and the first BOTW backfilled was won by one of them. `selectClanEventPicker` returns **both** `winner` (whoever the rule names, in the clan or not) and `standIn` (the most recent winner of that type still here, only when the winner has gone) — and the pane says both out loud. It deliberately does **not** silently skip a departed winner: a moderator who cannot tell a stand-in from the rule's real answer has no way to know the rule was overridden. A stand-in is never taken from the other event type.

Wins themselves are **never** filtered by `is_active` — not in `clan_event_wins`, not in `getClanEventWinCounts`, not in the events table. A win is a historical fact; dropping someone the day they leave rewrites the record and silently shifts everyone else's tally. Departed members are marked (`.departedTag`) instead. This is the one place the usual "filter to `players.isActive`" data-source convention does not apply.

**The nav indicator is the one thing in the bar allowed to move.** `EventStatus` (`app/components/event-status.tsx`) renders **nothing** when no event is running or queued — a nav item reading "no event" is noise — and pulses only while one is live. The modal's standings put first place in display type and the accent; the rest of the table stays flat, because the point is that one name stands out, not that five sizes do. A Temple outage shows "standings unknown", never an empty table.

## Admin dashboard (`/admin`) — the only place staff roles are granted

A staff role is the one thing on this site that grants **elevated access**, so it is never requested through the rank calculator (points ranks are; staff standing isn't on the points ladder at all). It is granted from `/admin` by someone who already outranks you.

**The whole permission model is `app/utils/staff-permissions.ts`** — one file, fully spec'd in `staff-permissions.spec.ts`. Don't scatter role comparisons elsewhere; import from there.

- `staffRoleOrder` — moderator(1) < admin(2) < deputy_owner(3) < owner(4).
- `elevatedStaffRoles` = **admin, deputy_owner, owner**. These carry site permissions and are the only roles the dashboard hands out. **Moderator is deliberately outside the set** — it is clan-chat standing, not access — and keeping it out is what makes the agreed rule come out right: an admin has no elevated role beneath their own, so **an admin can promote nobody**, a deputy owner can promote admins, and an owner can promote admins and deputy owners.
- `grantableStaffRoles(actor)` = elevated roles **strictly below** the actor. Nobody can grant their own role, so **owner is never assignable from the UI** — the top of the ladder stays an out-of-band decision (set `players.staff_role` directly).
- `canManageStaffRole` additionally refuses **self-service**: you cannot act on a member whose row shares your Discord id, or the whole ladder has a blind spot at the top.
- Revoking (`nextRole: null`) uses the same outranking rule. A role-granting screen with no undo is a trap, so revoke is included even though the brief said "promote".

**Layering.** `app/admin/page.tsx` (server) → `fetchAdminDashboard` → `StaffRoles` (client). The page has three panes (`admin-panes.tsx`) — Events, Staff ranks, Discord bans — swapped client-side, not routed, because the server component already fetched all three. The access check lives in the **data source**, not just the page, so nothing gets the roster by importing around it. `middleware.ts` gates `/admin` on being signed in only — the staff ladder is invisible to a Discord session, so the page redirects non-elevated users to `/dashboard` rather than erroring (its existence isn't something they need to know about).

**The client is never trusted.** `setStaffRoleAction` re-reads the actor's own role from the database against their Discord session, and `setPlayerStaffRole` checks the ladder a **second time inside its transaction** against the target's role *now* — the dashboard checked against a copy that may be minutes old, and two deputies acting at once must not walk each other up. The client only says what it wants, never who it is.

**Audit.** `staff_role_changes` (migration `0018`) records every grant and revoke with both the actor's player name and their Discord id — the Discord account is the identity that actually authorised it. Rendered as the dashboard's "Recent changes" panel via `getStaffRoleChanges`.

**Nav.** The Admin link is shown by `useViewerStaffRole` (→ `GET /api/staff-role`) rather than prop-drilled, because `NavBar` is rendered from three unrelated trees. It's cosmetic — the page re-checks.

### Discord is mirrored, not asked

A grant or revoke moves the member's **real Discord permissions** in the same breath. `staffRoleDiscordRoles` (`config/discord-roles.ts`) maps each staff role to the server role that carries them, and the permission gradient lines up with the ladder exactly: Owner has ADMINISTRATOR, Deputy Owner has everything short of it, Staff has MANAGE_ROLES/MANAGE_MESSAGES/kick/ban, Moderator has kick.

- **`admin` is the Discord role named "Staff"** — the server has no role called "Administrator". It sits between Moderator and Deputy Owner in both position and permissions, which is the admin tier. In-app the same role is *titled* Administrator (`staffRoleRanks.admin`), because that's the in-game clan rank whose icon it borrows. Don't "fix" this mismatch by renaming either side.
- Staff carries **MANAGE_ROLES**, which is what `userCanModerateSubmission` checks — so granting admin also grants the ability to approve rank submissions.
- `planStaffDiscordRoleChange` (pure, spec'd) is the rule: Discord ends up saying **exactly** what `players.staff_role` says. Every *other* staff role is stripped, so moderator → admin is a swap, not an addition, and a revoke leaves none of the four. Points-rank roles are never touched. `syncStaffDiscordRole` just carries the plan out.
- **The bot can reach these roles** only because its highest role (`Robots`, position 54) sits above Owner (52) and its own role carries MANAGE_ROLES. Drop either below Owner in server settings and every call starts failing with `50013`.

**Failure is reported, not rolled back.** The DB write is authoritative and has already landed when Discord is called, so an outage can't undo a promotion — the action returns `discord: 'synced' | 'not-in-server' | 'failed'` and the toast says which. Since re-assigning a role a member already holds is refused (it would be an audit row recording no change), a failed sync would otherwise be unrecoverable from the app: hence **"Re-sync Discord roles"** in the Manage menu (`syncStaffDiscordRoleAction`), which pushes the stored role again, writes no audit row, and needs the same outranking permission.
