import { MilestoneAccomplishmentType } from '@/app/schemas/accomplishments';

/**
 * The thresholds that turn a stat into news.
 *
 * These are deliberately sparse. Every threshold a member crosses becomes a row
 * in the feed, so a tight ladder would bury the one-off feats (an inferno cape,
 * a pet) under a stream of round numbers. Spacing widens as the numbers get
 * bigger, because the effort between them does too.
 *
 * They are also **append-only in practice**: lowering a threshold retroactively
 * announces it for everyone who is already past it, since detection is stateless
 * (see `detectAccomplishments`). Raising or removing one is safe — the rows
 * already written simply stop being re-detected.
 */
export const milestoneThresholds = {
  collection_log: [100, 250, 500, 750, 1000, 1250, 1500, 1750],
  // Below 1,500 is not yet a milestone; `maxed` covers the top of the ladder.
  total_level: [1500, 1750, 2000, 2100, 2200, 2300],
  ehb: [100, 250, 500, 1000, 1500, 2000, 3000],
  ehp: [100, 250, 500, 1000, 1500, 2000, 3000],
} as const satisfies Record<MilestoneAccomplishmentType, readonly number[]>;

/**
 * The combat achievement tiers worth announcing. The lower tiers are a step on
 * the way rather than an accomplishment in their own right, and the clan is an
 * ironman clan — Master and Grandmaster are the ones that mean something.
 */
export const notableCombatAchievementTiers = ['Master', 'Grandmaster'] as const;

/**
 * Clogging the Cursed phalanx is only possible at 500+ invocation, so the item
 * is the proof of the raid level rather than a drop worth noting on its own.
 */
export const cursedPhalanxItemName = 'Cursed phalanx';

/** How many accomplishments the homepage and dashboard feeds show. */
export const accomplishmentFeedSize = 10;
