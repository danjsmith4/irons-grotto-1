import { customDiaryDiscordRoles } from '@/config/discord-roles';
import { calculateCustomDiaryTierMultipliers } from './calculate-custom-diary-tier-multipliers';

it('calculates the correct tier multipliers', () => {
  const roles = new Set<string>([
    customDiaryDiscordRoles['Collection Log'].get('Duke')!,
    customDiaryDiscordRoles.Combat.get('Baron')!,
    customDiaryDiscordRoles.Skilling.get('Bartender')!,
  ]);

  const {
    collectionLogBonusMultiplier,
    combatBonusMultiplier,
    skillingBonusMultiplier,
  } = calculateCustomDiaryTierMultipliers(roles);

  expect(collectionLogBonusMultiplier).toEqual(0.4);
  expect(combatBonusMultiplier).toEqual(0.3);
  expect(skillingBonusMultiplier).toEqual(0.1);
});

it('calculates the correct tier multipliers when multiple roles for the same diary are present', () => {
  const roles = new Set<string>([
    customDiaryDiscordRoles['Collection Log'].get('Duke')!,
    customDiaryDiscordRoles['Collection Log'].get('Baron')!,
    customDiaryDiscordRoles.Combat.get('Baron')!,
    customDiaryDiscordRoles.Combat.get('Duke')!,
    customDiaryDiscordRoles.Skilling.get('Bartender')!,
    customDiaryDiscordRoles.Skilling.get('Landlord')!,
  ]);

  const {
    collectionLogBonusMultiplier,
    combatBonusMultiplier,
    skillingBonusMultiplier,
  } = calculateCustomDiaryTierMultipliers(roles);

  expect(collectionLogBonusMultiplier).toEqual(0.4);
  expect(combatBonusMultiplier).toEqual(0.4);
  expect(skillingBonusMultiplier).toEqual(0.2);
});
