import { z } from 'zod';
import {
  ClueScrollTier,
  CombatAchievementTier,
  DiaryLocation,
  DiaryTier,
  TzHaarCape,
} from './osrs';
import { AccountType, StaffRole } from './staff';
import { RankSubmissionDiff } from './rank-calculator';

/**
 * The sheet, exactly as it was when submitted.
 *
 * **A frozen copy, not an import of `RankCalculatorSchema`.** That distinction
 * is the whole point of this file. The moderator view used to cast the stored
 * blob straight to the live schema, which meant the next change to the
 * calculator's shape would make every historical submission parse wrong or
 * crash — a record of what someone submitted in March cannot be re-interpreted
 * by a schema written in August.
 *
 * So: when the calculator's shape changes, **do not edit this**. Add a `V2`
 * beside it and a case to the parser below. Old rows keep parsing as what they
 * were.
 */
export const RankSubmissionSnapshotV1 = z.object({
  playerName: z.string(),
  joinDate: z.coerce.date(),
  acquiredItems: z.record(z.boolean().optional()),
  achievementDiaries: z.record(DiaryLocation, DiaryTier),
  collectionLogCount: z.coerce.number(),
  collectionLogTotal: z.coerce.number(),
  combatAchievementTier: CombatAchievementTier,
  ehb: z.coerce.number(),
  ehp: z.coerce.number(),
  totalLevel: z.coerce.number(),
  totalXp: z.coerce.number(),
  accountType: AccountType.nullable().default(null),
  staffRole: StaffRole.nullable().default(null),
  proofLink: z.union([z.string().nullish(), z.literal('')]),
  tzhaarCape: TzHaarCape,
  hasBloodTorva: z.boolean(),
  hasRadiantOathplate: z.boolean(),
  hasDizanasQuiver: z.boolean(),
  hasAchievementDiaryCape: z.boolean(),
  combatBonusPoints: z.number(),
  skillingBonusPoints: z.number(),
  collectionLogBonusPoints: z.number(),
  notableItemsBonusPoints: z.number(),
  // Filled rather than required: a historical row missing a tier should still
  // open, and every reader wants all six present.
  clueScrollCounts: z
    .record(ClueScrollTier, z.coerce.number())
    .transform((counts) => ({
      Beginner: counts.Beginner ?? 0,
      Easy: counts.Easy ?? 0,
      Medium: counts.Medium ?? 0,
      Hard: counts.Hard ?? 0,
      Elite: counts.Elite ?? 0,
      Master: counts.Master ?? 0,
    })),
});

export type RankSubmissionSnapshotV1 = z.infer<typeof RankSubmissionSnapshotV1>;

/** The envelope every stored snapshot and diff carries. */
export const VersionedSnapshot = z.object({
  version: z.literal(1),
  data: RankSubmissionSnapshotV1,
});

export const VersionedDiff = z.object({
  version: z.literal(1),
  data: RankSubmissionDiff,
});

/**
 * Reads a stored snapshot, whatever version it was written at.
 *
 * Lenient on purpose: a submission is history, and a moderator being unable to
 * open a two-year-old application because one field drifted is worse than
 * showing it with a gap. Anything unparseable comes back null and the caller
 * decides.
 */
export function parseSnapshot(
  stored: unknown,
): RankSubmissionSnapshotV1 | null {
  const envelope = VersionedSnapshot.safeParse(stored);

  return envelope.success ? envelope.data.data : null;
}

export function parseDiff(stored: unknown): RankSubmissionDiff | null {
  const envelope = VersionedDiff.safeParse(stored);

  return envelope.success ? envelope.data.data : null;
}
