import { CustomDiarySection } from '@/app/schemas/custom-diaries';
import { customDiaryDiscordRoles } from '@/config/discord-roles';
import { customDiaryTierBonusPoints } from '@/config/custom-diaries';

export function calculateCustomDiaryTierBonusPoints(
  discordRoles: Set<string> | null,
) {
  if (!discordRoles) {
    return {
      collectionLogBonusPoints: 0,
      combatBonusPoints: 0,
      skillingBonusPoints: 0,
    };
  }

  const { Combat: combatBonusPoints } = (
    Object.keys(
      customDiaryDiscordRoles,
    ) as (keyof typeof customDiaryDiscordRoles)[]
  ).reduce(
    (acc, key) => ({
      ...acc,
      [key]: [...customDiaryDiscordRoles[key]].reduce(
        (tierMultiplier, [tier, roleId]) =>
          discordRoles.has(roleId)
            ? customDiaryTierBonusPoints[tier]
            : tierMultiplier,
        0,
      ),
    }),
    {} as Record<CustomDiarySection, number>,
  );

  return {
    combatBonusPoints,
  };
}
