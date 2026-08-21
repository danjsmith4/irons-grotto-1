import { Rank } from '@/config/enums';
import {
  fetchItemDropRates,
  generateRequiredItemList,
} from '../data-sources/fetch-dropped-item-info';
import { buildNotableItemList } from './build-notable-item-list';
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
import { calculateRank } from './calculators/calculate-rank';
import type { PlayerDetailsResponse } from '../data-sources/fetch-player-details/fetch-player-details';

export interface PlayerPointsResult {
  totalPoints: number;
  rank: Rank;
}

/**
 * The whole point calculation, server-side, from a player's stored details.
 *
 * This used to exist only twice over: once inline in `check-auto-rank`, and
 * once in the browser, where `CalculatorHero` posted whatever number it had
 * arrived at to `updatePlayerPointsAction`. The client version is the one that
 * mattered, because it meant **the leaderboard was whatever the client said it
 * was** — the action took a player name and a number, with no authentication
 * and no validation, so any signed-in member could set anyone's score.
 *
 * Points are a function of the stored record, so they are computed from it.
 * The browser still calculates a running total for display; it just no longer
 * gets a vote on what is saved.
 */
export async function calculatePlayerPoints(
  data: PlayerDetailsResponse,
): Promise<PlayerPointsResult> {
  const {
    joinDate,
    collectionLogTotal,
    collectionLogCount,
    acquiredItems,
    achievementDiaries,
    ehp,
    ehb,
    totalLevel,
    combatAchievementTier,
    accountType,
    tzhaarCape,
    hasBloodTorva,
    hasRadiantOathplate,
    hasDizanasQuiver,
    hasAchievementDiaryCape,
    collectionLogBonusPoints,
    combatBonusPoints,
    notableItemsBonusPoints,
    skillingBonusPoints,
    clueScrollCounts,
  } = data;

  const dropRates = await fetchItemDropRates([...generateRequiredItemList()]);
  const items = Object.entries(await buildNotableItemList(dropRates));
  const scaling = calculateScaling(joinDate);

  const collectionLogSlotPoints = calculateCollectionLogSlotPoints(
    collectionLogCount,
    scaling,
  );
  const { totalPoints: clueScrollPoints } = calculateClueScrollPoints(
    clueScrollCounts,
    scaling,
  );
  const { pointsAwarded: totalCollectionLogPoints } =
    calculateCollectionLogAndCluesPoints(
      collectionLogSlotPoints,
      collectionLogTotal,
      clueScrollPoints,
      collectionLogBonusPoints,
      0.0,
      scaling,
    );
  const { pointsAwarded: totalNotableItemsPoints } =
    calculateNotableItemsPoints(
      items,
      acquiredItems,
      notableItemsBonusPoints,
      scaling,
    );
  const { pointsAwarded: achievementDiariesPoints } =
    calculateAchievementDiaryPoints(achievementDiaries, scaling);
  const ehpPoints = calculateEhpPoints(ehp, scaling);
  const totalLevelPoints = calculateTotalLevelPoints(totalLevel, scaling);
  const achievementDiaryCapePoints = calculateAchievementDiaryCapePoints(
    hasAchievementDiaryCape,
    scaling,
  );
  const { pointsAwarded: totalSkillingPoints } = calculateSkillingPoints(
    achievementDiariesPoints,
    ehpPoints,
    totalLevelPoints,
    achievementDiaryCapePoints,
    skillingBonusPoints,
    scaling,
  );
  const ehbPoints = calculateEhbPoints(ehb);
  const combatAchievementTierPoints = calculateCombatAchievementPoints(
    combatAchievementTier,
    scaling,
  );
  const tzhaarCapePoints = calculateTzhaarCapePoints(tzhaarCape, scaling);
  const bloodTorvaPoints = calculateBloodTorvaPoints(hasBloodTorva, scaling);
  const radiantOathplatePoints = calculateRadiantOathplatePoints(
    hasRadiantOathplate,
    scaling,
  );
  const dizanasQuiverPoints = calculateDizanasQuiverPoints(
    hasDizanasQuiver,
    scaling,
  );
  const { pointsAwarded: totalCombatPoints } = calculateCombatPoints(
    ehbPoints,
    combatAchievementTierPoints,
    tzhaarCapePoints,
    bloodTorvaPoints,
    radiantOathplatePoints,
    dizanasQuiverPoints,
    combatBonusPoints,
    scaling,
  );

  const totalPoints = calculateTotalPoints(
    totalCollectionLogPoints,
    totalNotableItemsPoints,
    totalSkillingPoints,
    totalCombatPoints,
  );

  const { rank } = calculateRank(
    acquiredItems,
    combatAchievementTier,
    totalPoints,
    accountType,
  );

  return { totalPoints, rank };
}
