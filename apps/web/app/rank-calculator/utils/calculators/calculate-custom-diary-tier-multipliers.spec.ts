import { customDiaryDiscordRoles } from '@/config/discord-roles';
import {
  clogDiaryTierBonusPoints,
  customDiaryTierBonusPoints,
} from '@/config/custom-diaries';
import { calculateCombatDiaryTierBonusPoints } from './calculate-custom-diary-tier-multipliers';

function withRoles(...roles: string[]) {
  return { status: 'ok' as const, roles: new Set(roles) };
}

it('calculates the correct tier bonus points', () => {
  const result = calculateCombatDiaryTierBonusPoints(
    withRoles(
      customDiaryDiscordRoles.Combat.get('Easy')!,
      customDiaryDiscordRoles.Clog.get('Elite')!,
    ),
  );

  expect(result).toEqual({
    combatBonusPoints: customDiaryTierBonusPoints.Easy,
    collectionLogBonusPoints: clogDiaryTierBonusPoints.Elite,
  });
});

it('takes the highest tier when multiple roles for the same diary are present', () => {
  const result = calculateCombatDiaryTierBonusPoints(
    withRoles(
      customDiaryDiscordRoles.Combat.get('Easy')!,
      customDiaryDiscordRoles.Combat.get('Hard')!,
    ),
  );

  expect(result).toEqual({
    combatBonusPoints: customDiaryTierBonusPoints.Hard,
    collectionLogBonusPoints: 0,
  });
});

it('awards no bonus points when the user has left the guild', () => {
  expect(
    calculateCombatDiaryTierBonusPoints({ status: 'not-a-member' }),
  ).toEqual({
    combatBonusPoints: 0,
    collectionLogBonusPoints: 0,
  });
});

it('returns null when discord could not be reached, so the caller keeps its stored values', () => {
  expect(
    calculateCombatDiaryTierBonusPoints({
      status: 'unavailable',
      error: new Error('rate limited'),
    }),
  ).toBeNull();

  expect(calculateCombatDiaryTierBonusPoints(null)).toBeNull();
});
