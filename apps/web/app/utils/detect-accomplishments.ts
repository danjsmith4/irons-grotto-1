import {
  CombatAchievementTier,
  DiaryTier,
  maximumTotalLevel,
  skillsCount,
  TzHaarCape,
} from '@/app/schemas/osrs';
import { AccomplishmentType } from '@/app/schemas/accomplishments';
import {
  cursedPhalanxItemName,
  milestoneThresholds,
  notableCombatAchievementTiers,
} from '@/config/accomplishments';
import { formatNumber } from './format-number';

/**
 * Everything the detector is allowed to look at. Assembled from the player row,
 * their achievement diaries and their acquired items — deliberately a plain
 * value so the rules below can be reasoned about and tested without a database.
 */
export interface AccomplishmentSnapshot {
  collectionLogCount: number;
  totalLevel: number;
  ehb: number;
  ehp: number;
  combatAchievementTier: string;
  tzhaarCape: string;
  hasBloodTorva: boolean;
  hasRadiantOathplate: boolean;
  hasDizanasQuiver: boolean;
  hasAchievementDiaryCape: boolean;
  /** Diary locations the player has completed at Elite. */
  eliteDiaryLocations: string[];
  acquiredItems: AcquiredItemSnapshot[];
}

export interface AcquiredItemSnapshot {
  itemId: number;
  itemName: string;
  dateFirstLogged: Date;
}

export interface DetectedAccomplishment {
  type: AccomplishmentType;
  /**
   * Stable identity, and the dedupe key. Never derive this from anything that
   * can change after the fact — the label and the count both can.
   */
  key: string;
  label: string;
  /** The threshold reached, for milestones. Null for one-off feats. */
  value: number | null;
  /**
   * When it actually happened, where that is knowable — the collection log
   * carries its own dates. Null means "we only know we can see it now", and the
   * caller stamps it with the time of the run.
   */
  achievedAt: Date | null;
}

const combatAchievementTierOrder = CombatAchievementTier.options;

function isAtLeastCombatAchievementTier(
  tier: string,
  required: CombatAchievementTier,
) {
  const reached = combatAchievementTierOrder.indexOf(
    tier as CombatAchievementTier,
  );

  return (
    reached >= 0 && reached >= combatAchievementTierOrder.indexOf(required)
  );
}

/**
 * Every threshold in `thresholds` that `value` has reached, as one
 * accomplishment each.
 *
 * A player who arrives already past several thresholds earns all of them. That
 * is what makes detection stateless: nothing has to remember which milestones
 * were announced last time, because the unique key does that in the database.
 */
function detectMilestones(
  type: keyof typeof milestoneThresholds,
  value: number,
  label: (threshold: number) => string,
): DetectedAccomplishment[] {
  return milestoneThresholds[type]
    .filter((threshold) => value >= threshold)
    .map((threshold) => ({
      type,
      key: `${type}:${threshold}`,
      label: label(threshold),
      value: threshold,
      achievedAt: null,
    }));
}

/**
 * Everything the player *currently* qualifies for — not what is new.
 *
 * The caller inserts these `on conflict do nothing`, so re-running is free and
 * a skipped run is caught up rather than lost. The price is that this function
 * can never announce something it cannot still see: a stat that goes backwards
 * (a de-ironed account, a Temple correction) keeps the row it already earned,
 * which is the behaviour we want anyway.
 */
export function detectAccomplishments(
  snapshot: AccomplishmentSnapshot,
): DetectedAccomplishment[] {
  const accomplishments: DetectedAccomplishment[] = [
    ...detectMilestones(
      'collection_log',
      snapshot.collectionLogCount,
      (threshold) => `${formatNumber(threshold)} collection log slots`,
    ),
    ...detectMilestones(
      'total_level',
      snapshot.totalLevel,
      (threshold) => `${formatNumber(threshold)} total level`,
    ),
    ...detectMilestones(
      'ehb',
      snapshot.ehb,
      (threshold) => `${formatNumber(threshold)} efficient hours bossed`,
    ),
    ...detectMilestones(
      'ehp',
      snapshot.ehp,
      (threshold) => `${formatNumber(threshold)} efficient hours played`,
    ),
  ];

  if (snapshot.totalLevel >= maximumTotalLevel) {
    accomplishments.push({
      type: 'maxed',
      key: 'maxed',
      label: `Maxed — level 99 in all ${skillsCount} skills`,
      value: maximumTotalLevel,
      achievedAt: null,
    });
  }

  // Only Elite counts. The lower tiers are a step towards it rather than
  // something the clan celebrates, and the diaries table stores the player's
  // highest tier per region, so an Elite row is a completed Elite diary.
  snapshot.eliteDiaryLocations.forEach((location) => {
    accomplishments.push({
      type: 'elite_diary',
      key: `elite_diary:${location}`,
      label: `${location} elite diary`,
      value: null,
      achievedAt: null,
    });
  });

  if (snapshot.hasAchievementDiaryCape) {
    accomplishments.push({
      type: 'diary_cape',
      key: 'diary_cape',
      label: 'Achievement diary cape',
      value: null,
      achievedAt: null,
    });
  }

  // Grandmaster implies Master, and a player who arrives at Grandmaster earns
  // both — the same rule as the milestone ladders above.
  notableCombatAchievementTiers
    .filter((tier) =>
      isAtLeastCombatAchievementTier(snapshot.combatAchievementTier, tier),
    )
    .forEach((tier) => {
      accomplishments.push({
        type: 'combat_achievement',
        key: `combat_achievement:${tier}`,
        label: `${tier} combat achievements`,
        value: null,
        achievedAt: null,
      });
    });

  if (snapshot.tzhaarCape === TzHaarCape.enum['Infernal cape']) {
    accomplishments.push({
      type: 'inferno',
      key: 'inferno',
      label: 'Completed the Inferno',
      value: null,
      achievedAt: null,
    });
  }

  if (snapshot.hasDizanasQuiver) {
    accomplishments.push({
      type: 'colosseum',
      key: 'colosseum',
      label: 'Completed the Fortis Colosseum',
      value: null,
      achievedAt: null,
    });
  }

  if (snapshot.hasBloodTorva) {
    accomplishments.push({
      type: 'blood_torva',
      key: 'blood_torva',
      label: 'Blood torva',
      value: null,
      achievedAt: null,
    });
  }

  if (snapshot.hasRadiantOathplate) {
    accomplishments.push({
      type: 'radiant_oathplate',
      key: 'radiant_oathplate',
      label: 'Radiant oathplate',
      value: null,
      achievedAt: null,
    });
  }

  snapshot.acquiredItems.forEach((item) => {
    if (item.itemName === cursedPhalanxItemName) {
      accomplishments.push({
        type: 'toa_cursed_phalanx',
        key: 'toa_cursed_phalanx',
        label: 'Cursed phalanx — Tombs of Amascut at 500 invocation',
        value: null,
        achievedAt: item.dateFirstLogged,
      });
    }
  });

  return accomplishments;
}

/**
 * The diary locations a player has completed at Elite, from the stored diary
 * rows. Each row holds the player's *highest* tier for that region, so Elite is
 * only ever present once the region is finished.
 */
export function eliteDiaryLocationsFrom(
  diaries: { location: string; tier: string; completed: boolean }[],
): string[] {
  return diaries
    .filter((diary) => diary.completed && diary.tier === DiaryTier.enum.Elite)
    .map((diary) => diary.location);
}
