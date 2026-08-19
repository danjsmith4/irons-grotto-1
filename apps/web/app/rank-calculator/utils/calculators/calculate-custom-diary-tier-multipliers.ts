import { customDiaryDiscordRoles } from '@/config/discord-roles';
import {
  clogDiaryTierBonusPoints,
  customDiaryTierBonusPoints,
} from '@/config/custom-diaries';
import { DiscordRolesResult } from '../../data-sources/fetch-user-discord-roles';

/**
 * `null` means "unknown" — the caller could not reach Discord and must keep
 * whatever bonus points it already has, rather than persisting a zero that is
 * indistinguishable from a member holding no diary roles.
 */
export function calculateCombatDiaryTierBonusPoints(
  discordRoles: DiscordRolesResult | null,
) {
  if (!discordRoles || discordRoles.status === 'unavailable') {
    return null;
  }

  const roles =
    discordRoles.status === 'ok' ? discordRoles.roles : new Set<string>();

  // More readable imperative approach
  let combatBonusPoints = 0;
  const combatRoles = customDiaryDiscordRoles.Combat;
  for (const [tier, roleId] of combatRoles) {
    if (roles.has(roleId)) {
      combatBonusPoints = customDiaryTierBonusPoints[tier];
    }
  }

  let collectionLogBonusPoints = 0;
  const clogRoles = customDiaryDiscordRoles.Clog;
  for (const [tier, roleId] of clogRoles) {
    if (roles.has(roleId)) {
      collectionLogBonusPoints = clogDiaryTierBonusPoints[tier];
    }
  }

  return {
    combatBonusPoints,
    collectionLogBonusPoints,
  };
}
