import {
  achievementDefinitions,
  type AchievementKey,
  type AchievementScan,
  type CollectionLogScan,
  type TempleScan,
} from '../scan-types';

export interface AchievementSources {
  temple: Pick<TempleScan, 'hasInfernal' | 'isMaxed'> | null;
  collectionLog: Pick<CollectionLogScan, 'hasFangKit'> | null;
  achievements: Pick<
    AchievementScan,
    'hasBlorva' | 'hasQuiver' | 'hasZukHelm'
  > | null;
}

/**
 * Which headline achievements have been *settled and revealed* so far.
 *
 * The second argument is what makes the sequence honest. A tile lights up only
 * once the source that settles it has had its turn in the scan — not when its
 * request happened to resolve. The requests run in parallel and finish out of
 * order; the reveal is deliberately ordered, and this is where the two are
 * reconciled.
 *
 * ⚠️ **An unrevealed source is not a negative.** Anything whose source has not
 * been revealed yet is simply absent from the result, exactly as an item the
 * player does not have is. That is fine here — the caller renders absence as
 * greyed out and the wall fills in as the scan runs — but it means this must
 * never be read as "these are the achievements they don't have" mid-scan.
 *
 * Radiant Oathplate is not in `achievementDefinitions` and so can never appear:
 * no source reports it, so it exists only as a claim in the calculator.
 */
export function resolveEarnedAchievements(
  sources: AchievementSources,
  revealedSources: ReadonlySet<string>,
): Set<AchievementKey> {
  const earned = new Set<AchievementKey>();

  /**
   * One reader per achievement, so adding a tile to `achievementDefinitions`
   * without saying how it is settled fails to compile rather than rendering as
   * permanently unearned.
   */
  const isHeld: Record<AchievementKey, boolean> = {
    infernal: sources.temple?.hasInfernal === true,
    maxed: sources.temple?.isMaxed === true,
    fangKit: sources.collectionLog?.hasFangKit === true,
    blorva: sources.achievements?.hasBlorva === true,
    quiver: sources.achievements?.hasQuiver === true,
    zukHelm: sources.achievements?.hasZukHelm === true,
  };

  achievementDefinitions.forEach(({ key, source }) => {
    if (revealedSources.has(source) && isHeld[key]) {
      earned.add(key);
    }
  });

  return earned;
}
