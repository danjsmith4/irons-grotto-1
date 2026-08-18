# Irons Grotto

Turborepo monorepo. The app lives in `apps/web` — a Next.js **App Router** site (Radix Themes + Tailwind, `@upstash/redis` + Postgres/Drizzle, Discord bot integration) for an Old School RuneScape ironman clan: rank calculator, leaderboard, dashboard.

## Running locally

```bash
cd apps/web && yarn dev      # NODE_OPTIONS=--inspect next dev --experimental-https
```

Served at **https://localhost:3000** (HTTPS with a self-signed cert — accept the browser warning; use `curl -k`). Typecheck with `yarn check-types`. Tests: `yarn test` (jest), `yarn e2e` (cypress).

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
- **`PlayerProfileModal`** — opens over the current window when a leaderboard player name (a `<button>`) is clicked. Fetches `GET /api/player-profile?name=` (→ `fetchPlayerProfile`): rank progress vs `rankThresholds`, stat grid, notable-item badges, clue tiers, achievement-diary matrix (`playerAchievementDiaries`, otherwise unused), and rank-up timeline. Prefer this modal over linking out to TempleOSRS.
- **`RarestDrops`** ("Rarest in the Grotto") ← `fetchCollectionLogInsights` — items the fewest members have logged, from `playerAcquiredItems`.

**Clickable player names, app-wide.** The profile modal is hosted once by `PlayerProfileProvider` (in `app/providers.tsx`). Render any clan member's name with `<PlayerNameButton name={rsn} .../>` (or call `usePlayerProfile().openProfile(name)`) and it opens their profile — used in the leaderboard, both activity feeds, the clogs scroller, and the inactivity checker. Prefer this over linking names out to TempleOSRS.

> **Design north-star:** the player profile modal (`player-profile-modal.tsx` + its module CSS) is the reference for the planned **rank-calculator page revamp** — that page is currently dated and due for a complete redesign in a later phase; pull its layout/type/hairline/token patterns from the modal.

Data-source convention: return `{ success: true, data } | { success: false, error }`; filter to `players.isActive`; `isMaxed = totalLevel === 2376`; pets = `playerAcquiredItems.itemId in AllPetItemIds`; infernal = `tzhaarCape === 'Infernal cape'`.

## Favicon / app icons (App Router gotcha)

Icons come from **file conventions**, not `metadata.icons`: `app/favicon.ico`, `app/icon.png`, `app/apple-icon.png` (all generated from `public/L1.png`). These files **take precedence over any `icons` field in `layout.tsx` metadata** — if the favicon is wrong, it's because a stale `app/favicon.ico` exists, not the metadata. To change icons, replace those files (regenerate from the logo with `sharp`); don't add `metadata.icons`.

## Rank-calculator approvals

`approveSubmission` only auto-handles **Standard** rank structures (assigns Discord roles + messages). **Non-Standard structures (Owner/Admin/etc.) throw and must be handled manually** — there are no Discord rank roles configured for them (`rankDiscordRoles` only covers `StandardRank`).
