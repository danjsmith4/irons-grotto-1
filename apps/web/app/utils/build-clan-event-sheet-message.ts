import {
  clanEventBotCommand,
  clanEventSheetCell,
  clanEventTypeLabels,
  type ClanEventType,
} from '@/config/clan-events';

export interface ClanEventSheetMessageInput {
  type: ClanEventType;
  /** The name Temple stored, which is what the competition page shows. */
  eventName: string;
  competitionUrl: string;
  /** Whether the competition id reached the events sheet. */
  sheetUpdated: boolean;
  /** The Discord role to ping — staff, who run the sheet. */
  staffRoleId: string;
}

/**
 * What staff see in `#sotw-and-botw` once an event has been created.
 *
 * Both outcomes are posted, not just success: a sheet that silently kept last
 * week's id is exactly the failure nobody notices until the event goes
 * missing, so a failed write says so where staff are already looking and hands
 * them the bot command that does the same job by hand.
 *
 * The link is wrapped in `<>` so Discord does not unfurl it into an embed.
 */
export function buildClanEventSheetMessage({
  type,
  eventName,
  competitionUrl,
  sheetUpdated,
  staffRoleId,
}: ClanEventSheetMessageInput): string {
  const label = clanEventTypeLabels[type];
  const cell = clanEventSheetCell[type];

  if (sheetUpdated) {
    return [
      `<@&${staffRoleId}> The new ${label}, **${eventName}**, has been added to the events sheet (\`${cell}\`).`,
      `<${competitionUrl}>`,
    ].join('\n');
  }

  return [
    `<@&${staffRoleId}> The new ${label}, **${eventName}**, was created on TempleOSRS, but the events sheet could not be updated.`,
    `Add it by hand with: \`${clanEventBotCommand[type]} ${competitionUrl}\``,
  ].join('\n');
}
