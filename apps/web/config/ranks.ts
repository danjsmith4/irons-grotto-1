import { z } from 'zod';
import { Rank } from './enums';
import { type AccountType, isMainAccount } from '@/app/schemas/staff';
import type {
  CollectionLogItemName,
  CombatAchievementTier,
} from '@/app/schemas/osrs';

export const rankNames: Partial<Record<Rank, string>> = {
  Astral: 'Staff',
};

export const StandardRank = Rank.extract([
  'Champion',
  'Recruit',
  'Pawn',
  'Corporal',
  'Novice',
  'Sergeant',
  'Cadet',
  'Lieutenant',
  'Proselyte',
  'Captain',
  'General',
  'Skulled',
  'Beast',
]);

export type StandardRank = z.infer<typeof StandardRank>;

/**
 * The points ladder every ironman is measured against. There is only one:
 * staff standing is metadata (`players.staff_role`), not a ladder of its own.
 */
export const rankThresholds: Partial<Record<Rank, number>> = {
  Champion: 0,
  Recruit: 500,
  Pawn: 1000,
  Corporal: 1750,
  Novice: 3000,
  Sergeant: 4500,
  Cadet: 7000,
  Lieutenant: 9000,
  Proselyte: 11000,
  Captain: 13000,
  General: 16000,
  Skulled: 19000,
  Beast: 24000,
} as const;

/**
 * A main account is never sorted onto the ironman ladder — it only ever holds
 * the single main-account rank, whatever its points.
 */
export const mainAccountRank = 'Looter' satisfies Rank;

export const mainAccountRankThresholds: Partial<Record<Rank, number>> = {
  [mainAccountRank]: 0,
} as const;

/**
 * The ladder a player's rank is resolved against, given their account type.
 * An unresolved (null) type gets the ironman ladder — this is an ironman clan,
 * and the main-account rank should never be applied on a guess.
 */
export function rankThresholdsFor(accountType: AccountType | null) {
  return isMainAccount(accountType)
    ? mainAccountRankThresholds
    : rankThresholds;
}

/**
 * Maps the required items needed to achieve each rank.
 * The items correspond to the form field on the page.
 */
export const rankRequiredItems: Partial<
  Record<Rank, CollectionLogItemName[][]>
> = {
  Novice: [
    ['Deadeye prayer scroll', 'Mystic vigour prayer scroll'],
    ['Deadeye prayer scroll', 'Arcane prayer scroll'],
    ['Dexterous prayer scroll', 'Arcane prayer scroll'],
    ['Dexterous prayer scroll', 'Mystic vigour prayer scroll'],
  ],
  Sergeant: [['Dragon warhammer'], ['Elder maul'], ['Bandos hilt']],
};

export const rankRequiredCombatAchievements: Partial<
  Record<Rank, CombatAchievementTier>
> = {
  Skulled: 'Master',
};
