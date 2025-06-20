import { CustomDiarySection } from '@/app/schemas/custom-diaries';
import { customDiaryDiscordRoles } from '@/config/discord-roles';
import { customDiaryTierMultipliers } from '@/config/custom-diaries';

export function calculateCustomDiaryTierMultipliers(
  discordRoles: Set<string> | null,
) {
  if (!discordRoles) {
    return {
      collectionLogBonusMultiplier: 0,
      combatBonusMultiplier: 0,
      skillingBonusMultiplier: 0,
    };
  }

  const {
    'Collection Log': collectionLogBonusMultiplier,
    Combat: combatBonusMultiplier,
    Skilling: skillingBonusMultiplier,
  } = (
    Object.keys(
      customDiaryDiscordRoles,
    ) as (keyof typeof customDiaryDiscordRoles)[]
  ).reduce(
    (acc, key) => ({
      ...acc,
      [key]: [...customDiaryDiscordRoles[key]].reduce(
        (tierMultiplier, [tier, roleId]) =>
          discordRoles.has(roleId)
            ? customDiaryTierMultipliers[tier]
            : tierMultiplier,
        0,
      ),
    }),
    {} as Record<CustomDiarySection, number>,
  );

  return {
    collectionLogBonusMultiplier,
    combatBonusMultiplier,
    skillingBonusMultiplier,
  };
}
