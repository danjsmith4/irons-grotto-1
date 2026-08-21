import { CombatAchievementTier, TzHaarCape } from '@/app/schemas/osrs';
import type { Player } from '@/lib/db/schema';
import {
  fillOnly,
  immutable,
  keepHighest,
  keepHighestOrdinal,
  keepTrue,
  managed,
  preferFresh,
  preferResolved,
  recomputed,
  replace,
  type MergeRule,
} from './merge';

/**
 * Who a column belongs to.
 *
 * Before this table existed, no file said who was allowed to write what, so
 * every write path re-derived the answer and they disagreed with each other.
 * The disagreements were the bugs: a batch refresh would overwrite a member's
 * blood torva with `false` because nothing said the player owned that claim,
 * and a special-case object existed in `fetch-player-details` to protect
 * exactly one field that someone had noticed.
 */
export type FieldOwner =
  /** Fixed at creation, or moved only by a dedicated transaction (rename). */
  | 'identity'
  /** Bookkeeping the write path maintains itself. */
  | 'system'
  /** Third-party data — Temple, WikiSync, hiscores, Discord roles. */
  | 'source'
  /** Both a source and the player may write; the merge rule arbitrates. */
  | 'contested'
  /** The player's own claim. No source can confirm or deny it. */
  | 'player'
  /** A function of other columns. Never accepted as input. */
  | 'derived'
  /** Granted by approval or by an admin. Never by the calculator form. */
  | 'staff';

/** Where a write came from. */
export type WriteOrigin = 'source' | 'player' | 'staff' | 'system';

/**
 * Which origins may write each class of column.
 *
 * `derived` accepts nothing: those columns are recomputed after the merge, so a
 * caller asserting one would be asserting something the data contradicts.
 */
export const originsByOwner = {
  identity: ['system'],
  system: ['system'],
  source: ['source'],
  contested: ['source', 'player'],
  player: ['player'],
  derived: [],
  staff: ['staff'],
} as const satisfies Record<FieldOwner, readonly WriteOrigin[]>;

export function canWrite(owner: FieldOwner, origin: WriteOrigin): boolean {
  return (originsByOwner[owner] as readonly WriteOrigin[]).includes(origin);
}

export interface FieldRule<T> {
  owner: FieldOwner;
  merge: MergeRule<T>;
  /** Why this rule, where the choice is not self-evident. */
  why?: string;
}

/**
 * Explicit rankings for the two ordered enums, rather than their declaration
 * order. Reordering a zod enum for readability must not silently change which
 * value beats which — and for `TzHaarCape` the declaration order is a
 * by-product of `CollectionLogItemName.extract()`, which is no basis for a
 * merge rule at all. Both are asserted exhaustive in the spec.
 */
const combatAchievementRanking = [
  'None',
  'Easy',
  'Medium',
  'Hard',
  'Elite',
  'Master',
  'Grandmaster',
] as const satisfies readonly CombatAchievementTier[];

const tzhaarCapeRanking = [
  'None',
  'Fire cape',
  'Infernal cape',
] as const satisfies readonly TzHaarCape[];

/**
 * The single source of truth for who writes what, and how values combine.
 *
 * **Exhaustive over the `players` table** — `field-ownership.spec.ts` checks it
 * against `getTableColumns(players)` at runtime, so adding a column fails the
 * suite until it is classified here. That runtime check is the one that matters;
 * the mapped type below is easy to silence with a cast, a red test is not.
 */
export const fieldOwnership: {
  [K in keyof Player]: FieldRule<Player[K]>;
} = {
  // ---- identity -----------------------------------------------------------
  playerName: {
    owner: 'identity',
    merge: immutable(),
    why: 'The primary key. A rename moves it, and every child table with it, in one dedicated transaction.',
  },
  joinDate: { owner: 'identity', merge: immutable() },
  discordUserId: {
    owner: 'identity',
    merge: fillOnly(),
    why: 'Claimed once. Preserves the existing rule that an account with an owner never gets a new one.',
  },

  // ---- source: third-party stats ------------------------------------------
  ehb: {
    owner: 'source',
    merge: preferFresh(),
    why: 'Temple periodically recalculates its EHB rates, so this legitimately moves down.',
  },
  ehp: { owner: 'source', merge: preferFresh(), why: 'As ehb.' },
  totalLevel: { owner: 'source', merge: keepHighest() },
  totalXp: { owner: 'source', merge: keepHighest() },
  collectionLogCount: {
    owner: 'source',
    merge: keepHighest(),
    why: 'Read from whichever of Temple or the hiscores is further ahead; neither is reliably current.',
  },
  collectionLogTotal: {
    owner: 'source',
    merge: preferFresh(),
    why: 'The size of the game, not a player stat. It moves when Jagex adds slots.',
  },

  // Clue counts only go up in game, so a lower reading means the source is
  // incomplete. Guarding this is the fix for a Temple outage — which returns a
  // null the old code mapped to 0 — wiping a member's clue counts entirely.
  clueCountBeginner: { owner: 'source', merge: keepHighest() },
  clueCountEasy: { owner: 'source', merge: keepHighest() },
  clueCountMedium: { owner: 'source', merge: keepHighest() },
  clueCountHard: { owner: 'source', merge: keepHighest() },
  clueCountElite: { owner: 'source', merge: keepHighest() },
  clueCountMaster: { owner: 'source', merge: keepHighest() },

  // Derived from Discord roles, and absent when Discord is unreachable.
  combatBonusPoints: { owner: 'source', merge: preferFresh() },
  skillingBonusPoints: { owner: 'source', merge: preferFresh() },
  collectionLogBonusPoints: { owner: 'source', merge: preferFresh() },
  notableItemsBonusPoints: { owner: 'source', merge: preferFresh() },

  // ---- contested: the player claims, a source may confirm -----------------
  combatAchievementTier: {
    owner: 'contested',
    // Explicitly `<string>`: the column is a varchar, not a pg enum, so the
    // ranking is narrower than what the database can actually hold. Anything
    // off the ranking sorts lowest, which is the safe direction.
    merge: keepHighestOrdinal<string>(combatAchievementRanking),
    why: 'A player may tick a tier WikiSync has not caught up on. The submission diff flags a mismatch for a moderator rather than overwriting it.',
  },
  tzhaarCape: {
    owner: 'contested',
    merge: keepHighestOrdinal<string>(tzhaarCapeRanking),
    why: 'As combatAchievementTier. Note the old write path could never set this back to None either, which this makes deliberate rather than accidental.',
  },
  hasBloodTorva: {
    owner: 'contested',
    merge: keepTrue(),
    why: 'Derived from four WikiSync combat achievements. When WikiSync is unreachable the patch omits it; a `false` here used to be written straight over a true.',
  },
  hasDizanasQuiver: {
    owner: 'contested',
    merge: keepTrue(),
    why: 'As hasBloodTorva, from a single combat achievement.',
  },
  accountType: {
    owner: 'contested',
    merge: preferResolved(),
    why: 'Temple wins whenever it resolves anything, but a null resolution is the absence of an answer — it reports null for a real main and for a group ironman it has never heard of alike — so it must not erase a stored one.',
  },
  gimGroupName: {
    owner: 'contested',
    merge: preferResolved(),
    why: 'Moves with accountType.',
  },

  // ---- player: nothing else can confirm these -----------------------------
  hasRadiantOathplate: {
    owner: 'player',
    merge: replace(),
    why: 'No data source exists, and it is absent from the submission diff, so no moderator sees it flagged either. Purely the player’s word, and they must be able to untick it.',
  },
  proofLink: {
    owner: 'player',
    merge: replace(),
    why: 'Must be clearable — the old `if (proofLink)` guard made removing a link impossible.',
  },
  isMobileOnly: { owner: 'player', merge: replace() },

  // ---- derived ------------------------------------------------------------
  hasAchievementDiaryCape: {
    owner: 'derived',
    merge: recomputed(),
    why: 'A function of the achievement diaries. The client already recomputes it on every diary change; this makes the server the authority.',
  },
  points: {
    owner: 'derived',
    merge: recomputed(),
    why: 'Recomputed from the whole record. Accepting it as input is how it came to drift from the stats it is supposed to summarise.',
  },

  // ---- staff --------------------------------------------------------------
  rank: {
    owner: 'staff',
    merge: replace(),
    why: 'Only a submission approval or an admin moves this. The calculator computes a *prospective* rank; it does not grant one.',
  },
  staffRole: {
    owner: 'staff',
    merge: replace(),
    why: 'Granted only from /admin, by someone who outranks the target.',
  },

  // ---- system -------------------------------------------------------------
  isActive: {
    owner: 'system',
    merge: replace(),
    why: 'Owned by the daily inactivity reconcile.',
  },
  createdAt: { owner: 'system', merge: immutable() },
  updatedAt: {
    owner: 'system',
    merge: managed(),
    why: 'Stamped by the write path on every commit.',
  },
};

/** The columns a given origin is permitted to write. */
export function fieldsWritableBy(origin: WriteOrigin): (keyof Player)[] {
  return (Object.keys(fieldOwnership) as (keyof Player)[]).filter((field) =>
    canWrite(fieldOwnership[field].owner, origin),
  );
}
