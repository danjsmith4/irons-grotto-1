import 'server-only';
import { sendDiscordMessage } from '@/app/player/utils/send-discord-message';
import { updateSheetCell } from '@/app/data-sources/google-sheets';
import { buildClanEventSheetMessage } from '@/app/utils/build-clan-event-sheet-message';
import {
  clanEventAnnouncementChannelId,
  clanEventSheetCell,
  clanEventSheetId,
  type ClanEventType,
} from '@/config/clan-events';
import { staffRoleDiscordRoles } from '@/config/discord-roles';
import { clientConstants } from '@/config/constants.client';

export interface ClanEventHandoff {
  sheet: 'updated' | 'failed';
  discord: 'sent' | 'failed';
}

/** The Discord role named "Staff" — who runs the events sheet. */
const staffRoleId = staffRoleDiscordRoles.admin;

/**
 * Records a newly created competition on the clan's events sheet, then tells
 * staff in `#sotw-and-botw`.
 *
 * This used to post `.botw <url> <key>` for Grotto Bot to act on, but the bot
 * is a discord.py `commands.Bot`, which ignores every message written by
 * another bot — so the command landed and nothing ever ran it. The site now
 * makes the bot's single-cell write itself.
 *
 * The message is posted whether or not the write landed: on failure it tells
 * staff so, with the bot command that does the same job by hand.
 */
export async function announceClanEvent({
  type,
  competitionId,
  eventName,
}: {
  type: ClanEventType;
  competitionId: number;
  eventName: string;
}): Promise<ClanEventHandoff> {
  let sheet: ClanEventHandoff['sheet'] = 'updated';

  try {
    await updateSheetCell({
      spreadsheetId: clanEventSheetId,
      range: clanEventSheetCell[type],
      value: competitionId,
    });
  } catch (error) {
    console.error(
      `Failed to write clan event ${competitionId} to the events sheet:`,
      error,
    );
    sheet = 'failed';
  }

  try {
    await sendDiscordMessage(
      {
        content: buildClanEventSheetMessage({
          type,
          eventName,
          competitionUrl: `${clientConstants.temple.baseUrl}/competitions/standings.php?id=${competitionId}`,
          sheetUpdated: sheet === 'updated',
          staffRoleId,
        }),
        // The name is typed by staff and echoed by Temple; nothing in it gets
        // to ping anyone. Only the staff role is allowed through.
        allowed_mentions: { parse: [], roles: [staffRoleId] },
      },
      clanEventAnnouncementChannelId,
    );

    return { sheet, discord: 'sent' };
  } catch (error) {
    console.error(
      `Failed to tell staff about clan event ${competitionId}:`,
      error,
    );

    return { sheet, discord: 'failed' };
  }
}
