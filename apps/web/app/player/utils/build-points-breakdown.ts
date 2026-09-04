import Decimal from 'decimal.js-light';
import { ItemCategoryMap } from '@/app/schemas/items';
import { AchievementDiaryMap } from '@/app/schemas/rank-calculator';
import {
  ClueScrollTier,
  CombatAchievementTier,
  DiaryLocation,
  TzHaarCape,
} from '@/app/schemas/osrs';
import { calculateScaling } from './calculators/calculate-scaling';
import { calculateCollectionLogSlotPoints } from './calculators/calculate-collection-log-slot-points';
import { calculateClueScrollPoints } from './calculators/calculate-clue-scroll-points';
import { calculateCollectionLogAndCluesPoints } from './calculators/calculate-collection-log-and-clues-points';
import { calculateNotableItemsPoints } from './calculators/calculate-notable-items-points';
import { calculateAchievementDiaryPoints } from './calculators/calculate-achievement-diary-points';
import { calculateEhpPoints } from './calculators/calculate-ehp-points';
import { calculateTotalLevelPoints } from './calculators/calculate-total-level-points';
import { calculateAchievementDiaryCapePoints } from './calculators/calculate-achievement-diary-cape-points';
import { calculateSkillingPoints } from './calculators/calculate-skilling-points';
import { calculateEhbPoints } from './calculators/calculate-ehb-points';
import { calculateCombatAchievementPoints } from './calculators/calculate-combat-achievement-points';
import { calculateTzhaarCapePoints } from './calculators/calculate-tzhaar-cape-points';
import { calculateBloodTorvaPoints } from './calculators/calculate-blood-torva-points';
import { calculateRadiantOathplatePoints } from './calculators/calculate-radiant-oathplate-points';
import { calculateDizanasQuiverPoints } from './calculators/calculate-dizanas-quiver-points';
import { calculateCombatPoints } from './calculators/calculate-combat-points';
import { calculateTotalPoints } from './calculators/calculate-total-points';
import { stripEntityName } from './strip-entity-name';

export const pointsCategoryKeys = [
  'combat',
  'skilling',
  'collectionLog',
  'notableItems',
] as const;

export type PointsCategoryKey = (typeof pointsCategoryKeys)[number];

export const pointsCategoryLabels: Record<PointsCategoryKey, string> = {
  combat: 'Combat',
  skilling: 'Skilling',
  collectionLog: 'Collection log & clues',
  notableItems: 'Notable items',
};

/**
 * One addend of a player's total, at the finest granularity the calculator
 * actually works in — a single notable item, one diary location, one clue
 * tier.
 *
 * `key` is the identity used to line two players' ledgers up against each
 * other, so it must be derived from the *thing*, never from a value or a
 * label. `label`/`detail` are presentation only.
 */
export interface PointsBreakdownLine {
  key: string;
  label: string;
  category: PointsCategoryKey;
  points: number;
  /** The value behind the points, e.g. `412 EHB` or `Elite`. */
  detail?: string;
  /** Fully-formed wiki image URL, for the notable-item lines. */
  image?: string;
}

export interface PointsBreakdownCategory {
  key: PointsCategoryKey;
  label: string;
  points: number;
}

export interface PointsBreakdown {
  /** The sum of the four category totals — the calculator's own number. */
  totalPoints: number;
  categories: PointsBreakdownCategory[];
  lines: PointsBreakdownLine[];
}

/**
 * Everything the point calculation reads, and nothing else.
 *
 * Deliberately narrower than `PlayerDetailsResponse`: that type is what comes
 * back from a live round-trip to Temple, WikiSync and the wiki for one player
 * the viewer owns, which is the wrong shape (and far too expensive) for
 * scoring two arbitrary members side by side out of the database.
 */
export interface PointsBreakdownInput {
  joinDate: Date | null;
  ehb: number;
  ehp: number;
  totalLevel: number;
  combatAchievementTier: CombatAchievementTier;
  tzhaarCape: TzHaarCape;
  hasBloodTorva: boolean;
  hasRadiantOathplate: boolean;
  hasDizanasQuiver: boolean;
  hasAchievementDiaryCape: boolean;
  collectionLogCount: number;
  collectionLogTotal: number;
  clueScrollCounts: Record<ClueScrollTier, number>;
  achievementDiaries: AchievementDiaryMap;
  acquiredItems: Record<string, boolean>;
  combatBonusPoints: number;
  skillingBonusPoints: number;
  collectionLogBonusPoints: number;
  notableItemsBonusPoints: number;
}

const clueScrollTiers: ClueScrollTier[] = [
  'Beginner',
  'Easy',
  'Medium',
  'Hard',
  'Elite',
  'Master',
];

/**
 * The whole point calculation, itemised.
 *
 * `totalPoints` here **is** what gets stored in `players.points` — there is no
 * separate calculation for the leaderboard any more, so the headline and the
 * ledger cannot disagree. The lines are the calculators' *inputs*, which is
 * what makes the breakdown an explanation rather than a second opinion.
 *
 * Line points are raw — unrounded, and without the `Math.floor` each category
 * applies to its own sum — so a category's lines can come to a fraction of a
 * point less than its total. That is deliberate: the totals are authoritative
 * and the lines exist to be compared against another player's, where a shared
 * rounding rule matters more than reconciling to the last point.
 */
export function buildPointsBreakdown(
  input: PointsBreakdownInput,
  notableItemList: ItemCategoryMap,
): PointsBreakdown {
  const scaling = calculateScaling(input.joinDate);
  const lines: PointsBreakdownLine[] = [];

  // ---------------------------------------------------------------- combat
  const ehbPoints = calculateEhbPoints(input.ehb);
  const combatAchievementTierPoints = calculateCombatAchievementPoints(
    input.combatAchievementTier,
    scaling,
  );
  const tzhaarCapePoints = calculateTzhaarCapePoints(input.tzhaarCape, scaling);
  const bloodTorvaPoints = calculateBloodTorvaPoints(
    input.hasBloodTorva,
    scaling,
  );
  const radiantOathplatePoints = calculateRadiantOathplatePoints(
    input.hasRadiantOathplate,
    scaling,
  );
  const dizanasQuiverPoints = calculateDizanasQuiverPoints(
    input.hasDizanasQuiver,
    scaling,
  );
  const combat = calculateCombatPoints(
    ehbPoints,
    combatAchievementTierPoints,
    tzhaarCapePoints,
    bloodTorvaPoints,
    radiantOathplatePoints,
    dizanasQuiverPoints,
    input.combatBonusPoints,
    scaling,
  );

  lines.push(
    {
      key: 'combat:ehb',
      label: 'Efficient hours bossed',
      category: 'combat',
      points: ehbPoints,
      detail: `${Math.round(input.ehb).toLocaleString()} EHB`,
    },
    {
      key: 'combat:combat-achievements',
      label: 'Combat achievements',
      category: 'combat',
      points: combatAchievementTierPoints,
      detail: input.combatAchievementTier,
    },
    {
      key: 'combat:tzhaar-cape',
      label: 'TzHaar cape',
      category: 'combat',
      points: tzhaarCapePoints,
      detail: input.tzhaarCape,
    },
    {
      key: 'combat:blood-torva',
      label: 'Blood torva',
      category: 'combat',
      points: bloodTorvaPoints,
      detail: input.hasBloodTorva ? 'Owned' : 'Not owned',
    },
    {
      key: 'combat:radiant-oathplate',
      label: 'Radiant oathplate',
      category: 'combat',
      points: radiantOathplatePoints,
      detail: input.hasRadiantOathplate ? 'Owned' : 'Not owned',
    },
    {
      key: 'combat:dizanas-quiver',
      label: "Blessed dizana's quiver",
      category: 'combat',
      points: dizanasQuiverPoints,
      detail: input.hasDizanasQuiver ? 'Owned' : 'Not owned',
    },
    {
      key: 'combat:bonus',
      label: 'Combat bonus points',
      category: 'combat',
      points: combat.bonusPointsAwarded,
    },
  );

  // -------------------------------------------------------------- skilling
  const { pointMap: diaryPointMap, pointsAwarded: achievementDiariesPoints } =
    calculateAchievementDiaryPoints(input.achievementDiaries, scaling);
  const ehpPoints = calculateEhpPoints(input.ehp, scaling);
  const totalLevelPoints = calculateTotalLevelPoints(input.totalLevel, scaling);
  const achievementDiaryCapePoints = calculateAchievementDiaryCapePoints(
    input.hasAchievementDiaryCape,
    scaling,
  );
  const skilling = calculateSkillingPoints(
    achievementDiariesPoints,
    ehpPoints,
    totalLevelPoints,
    achievementDiaryCapePoints,
    input.skillingBonusPoints,
    scaling,
  );

  lines.push(
    {
      key: 'skilling:ehp',
      label: 'Efficient hours played',
      category: 'skilling',
      points: ehpPoints,
      detail: `${Math.round(input.ehp).toLocaleString()} EHP`,
    },
    {
      key: 'skilling:total-level',
      label: 'Total level',
      category: 'skilling',
      points: totalLevelPoints,
      detail: input.totalLevel.toLocaleString(),
    },
    {
      key: 'skilling:diary-cape',
      label: 'Achievement diary cape',
      category: 'skilling',
      points: achievementDiaryCapePoints,
      detail: input.hasAchievementDiaryCape ? 'Owned' : 'Not owned',
    },
    ...(Object.entries(diaryPointMap) as [DiaryLocation, number][]).map(
      ([location, points]) => ({
        key: `skilling:diary:${location}`,
        label: `${location} diary`,
        category: 'skilling' as const,
        points,
        detail: input.achievementDiaries[location] ?? 'None',
      }),
    ),
    {
      key: 'skilling:bonus',
      label: 'Skilling bonus points',
      category: 'skilling',
      points: skilling.bonusPointsAwarded,
    },
  );

  // --------------------------------------------------- collection log/clues
  const collectionLogSlotPoints = calculateCollectionLogSlotPoints(
    input.collectionLogCount,
    scaling,
  );
  const { tierPoints: cluePointsByTier, totalPoints: clueScrollPoints } =
    calculateClueScrollPoints(input.clueScrollCounts, scaling);
  const collectionLog = calculateCollectionLogAndCluesPoints(
    collectionLogSlotPoints,
    input.collectionLogTotal,
    clueScrollPoints,
    input.collectionLogBonusPoints,
    0.0,
    scaling,
  );

  lines.push(
    {
      key: 'collection-log:slots',
      label: 'Collection log slots',
      category: 'collectionLog',
      points: collectionLogSlotPoints,
      detail: `${input.collectionLogCount.toLocaleString()} / ${input.collectionLogTotal.toLocaleString()}`,
    },
    ...clueScrollTiers.map((tier) => ({
      key: `collection-log:clue:${tier}`,
      label: `${tier} clues`,
      category: 'collectionLog' as const,
      points: cluePointsByTier[tier],
      detail: `${(input.clueScrollCounts[tier] ?? 0).toLocaleString()} completed`,
    })),
    {
      key: 'collection-log:bonus',
      label: 'Collection log bonus points',
      category: 'collectionLog',
      points: collectionLog.bonusPointsAwarded,
    },
  );

  // --------------------------------------------------------- notable items
  const notableItemEntries = Object.entries(notableItemList);
  const notableItems = calculateNotableItemsPoints(
    notableItemEntries,
    input.acquiredItems,
    input.notableItemsBonusPoints,
    scaling,
  );

  let unscaledAcquiredPoints = 0;

  notableItemEntries.forEach(([categoryName, { items }]) => {
    items.forEach((item) => {
      const key = stripEntityName(item.name);

      if (!input.acquiredItems[key]) {
        return;
      }

      unscaledAcquiredPoints += item.points ?? 0;

      lines.push({
        key: `notable-item:${key}`,
        label: item.name,
        category: 'notableItems',
        points: new Decimal(item.points ?? 0).times(scaling).toNumber(),
        detail: categoryName,
        image: item.image,
      });
    });
  });

  // `calculateNotableItemsPoints` folds its bonus into a single number, so the
  // ledger has to reconstruct it — same two steps, same order, so the line and
  // the category total stay in step.
  const notableItemsBase = new Decimal(unscaledAcquiredPoints)
    .times(scaling)
    .toDecimalPlaces(0, Decimal.ROUND_FLOOR)
    .toNumber();

  lines.push({
    key: 'notable-items:bonus',
    label: 'Notable item bonus points',
    category: 'notableItems',
    points: notableItemsBase * input.notableItemsBonusPoints,
  });

  const categories: PointsBreakdownCategory[] = [
    { key: 'combat', label: pointsCategoryLabels.combat, points: combat.pointsAwarded },
    {
      key: 'skilling',
      label: pointsCategoryLabels.skilling,
      points: skilling.pointsAwarded,
    },
    {
      key: 'collectionLog',
      label: pointsCategoryLabels.collectionLog,
      points: collectionLog.pointsAwarded,
    },
    {
      key: 'notableItems',
      label: pointsCategoryLabels.notableItems,
      points: notableItems.pointsAwarded,
    },
  ];

  return {
    totalPoints: calculateTotalPoints(
      collectionLog.pointsAwarded,
      notableItems.pointsAwarded,
      skilling.pointsAwarded,
      combat.pointsAwarded,
    ),
    categories,
    lines,
  };
}
