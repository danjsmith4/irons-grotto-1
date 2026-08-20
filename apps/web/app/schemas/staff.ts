import { z } from 'zod';
import type { Rank } from '@/config/enums';

/**
 * Staff standing is metadata on a player, not a ladder they climb: an admin is
 * still ranked on points like everyone else, and simply wears the role. Stored
 * on `players.staff_role`, which is null for the vast majority of members.
 */
export const StaffRole = z.enum([
  'moderator',
  'admin',
  'deputy_owner',
  'owner',
]);

export type StaffRole = z.infer<typeof StaffRole>;

/**
 * Each staff role borrows the name and icon of the in-game clan rank it maps
 * to, so the badge matches what members see in the clan chat.
 */
export const staffRoleRanks = {
  moderator: 'Moderator',
  admin: 'Administrator',
  deputy_owner: 'Deputy Owner',
  owner: 'Owner',
} as const satisfies Record<StaffRole, Rank>;

/**
 * The account's game mode. Only `main` changes how a player is ranked — mains
 * are sorted into the single main-account rank and never onto the ironman
 * ladder. Every other value, unranked group ironman included, is an ironman.
 *
 * Stored on `players.account_type`, where **null means "not resolved yet"** and
 * is what triggers the account-type prompt. See `resolveTempleAccountType` for
 * why a main cannot simply be derived.
 */
export const AccountType = z.enum([
  'main',
  'ironman',
  'hardcore_ironman',
  'ultimate_ironman',
  'group_ironman',
  'hardcore_group_ironman',
  'unranked_group_ironman',
]);

export type AccountType = z.infer<typeof AccountType>;

export const accountTypeLabels = {
  main: 'Main',
  ironman: 'Ironman',
  hardcore_ironman: 'Hardcore ironman',
  ultimate_ironman: 'Ultimate ironman',
  group_ironman: 'Group ironman',
  hardcore_group_ironman: 'Hardcore group ironman',
  unranked_group_ironman: 'Unranked group ironman',
} as const satisfies Record<AccountType, string>;

/**
 * The in-game chat badge for each mode, as named on the OSRS Wiki. A main has
 * no chat badge in game, so it is absent here; `AccountTypeBadge` falls back to
 * the main-account rank's icon so that every resolved account still has a mark.
 * Only a null type renders nothing.
 */
export const accountTypeChatBadges = {
  ironman: 'Ironman chat badge',
  hardcore_ironman: 'Hardcore ironman chat badge',
  ultimate_ironman: 'Ultimate ironman chat badge',
  group_ironman: 'Group ironman chat badge',
  hardcore_group_ironman: 'Hardcore group ironman chat badge',
  unranked_group_ironman: 'Unranked group ironman chat badge',
} as const satisfies Record<Exclude<AccountType, 'main'>, string>;

export function isMainAccount(accountType: AccountType | null | undefined) {
  return accountType === AccountType.enum.main;
}

/**
 * What a player can tell us about themselves when TempleOSRS cannot say.
 *
 * Deliberately narrower than `AccountType`: every mode Temple *can* resolve is
 * resolved from Temple, so the only cases left to ask about are the three that
 * are indistinguishable from a main on every public API.
 */
export const AccountTypeChoice = AccountType.extract([
  'main',
  'group_ironman',
  'unranked_group_ironman',
]);

export type AccountTypeChoice = z.infer<typeof AccountTypeChoice>;

export const accountTypeChoiceLabels = {
  main: 'Main account',
  group_ironman: 'Group ironman',
  unranked_group_ironman: 'Unranked group ironman',
} as const satisfies Record<AccountTypeChoice, string>;
