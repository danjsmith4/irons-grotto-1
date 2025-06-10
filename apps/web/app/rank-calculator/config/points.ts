import {
  CombatAchievementTier,
  DiaryLocation,
  DiaryTier,
  maximumTotalLevel,
} from '@/app/schemas/osrs';

export const achievementDiaryTierPoints = {
  None: 0,
  Easy: 15,
  Medium: 25,
  Hard: 50,
  Elite: 75,
} satisfies Record<DiaryTier, number>;

export const pointsConfig = {
  notableItemsPointsPerHour: 1,
  sailingOffset: 4000,
  maxCapePoints: 3000,
  achievementDiaryCapePoints: 300,
  maximumTotalLevelPoints: 50000,
  maximumAchievementDiaryPoints:
    DiaryLocation.options.length * achievementDiaryTierPoints.Elite,
  maximumCombatAchievementPoints: 50000,
  bloodTorvaPoints: 250,
  dizanasQuiverPoints: 6500,
  infernalCapePoints: 7000,
  fireCapePoints: 500,
} as const satisfies Record<string, number>;

export const collectionLogSlotMilestonePoints = {
  100: 4,
  200: 8,
  300: 20,
  400: 40,
  500: 70,
  600: 85,
  700: 100,
  800: 125,
  900: 150,
  1000: 200,
  1100: 250,
  1200: 300,
  1300: 350,
} satisfies Record<number, number>;

export const totalLevelMilestonePoints = {
  1250: 75,
  1500: 150,
  1750: 250,
  2000: 500,
  2200: 775,
  [maximumTotalLevel]: 1750,
} as const satisfies Record<number, number>;

export const combatAchievementTierMilestonePoints = {
  None: 0,
  Easy: 50,
  Medium: 150,
  Hard: 300,
  Elite: 500,
  Master: 1000,
  Grandmaster: 3000,
} satisfies Record<CombatAchievementTier, number>;
