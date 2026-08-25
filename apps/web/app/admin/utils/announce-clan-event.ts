import 'server-only';
import { sendDiscordMessage } from '@/app/rank-calculator/utils/send-discord-message';
import {
  clanEventAnnouncementChannelId,
  clanEventBotCommand,
  type ClanEventType,
} from '@/config/clan-events';
import { clientConstants } from '@/config/constants.client';

export type AnnounceClanEventStatus = 'sent' | 'failed';

/**
 * Hands a newly created competition to the clan Discord bot.
 *
 * This is not a human-readable announcement — it is a **command for the bot**,
 * which takes it from there. The form is fixed by the bot, not by us:
 *
 *     .botw <competition url> <edit key>
 *
 * The edit key goes over Discord because the bot needs it to manage the
 * competition. That makes the destination channel as sensitive as the key —
 * anyone who can read it can edit or delete the competition — which is why the
 * channel is pinned in config rather than passed in by a caller.
 */
export async function announceClanEvent({
  type,
  competitionId,
  competitionKey,
}: {
  type: ClanEventType;
  competitionId: number;
  competitionKey: string | null;
}): Promise<AnnounceClanEventStatus> {
  // Without the key the command is incomplete, and posting half of it would
  // leave the bot to fail on a message nobody is watching.
  if (!competitionKey) {
    console.error(
      `Clan event ${competitionId} has no edit key, so the Discord command was not sent.`,
    );

    return 'failed';
  }

  const url = `${clientConstants.temple.baseUrl}/competitions/standings.php?id=${competitionId}`;

  try {
    await sendDiscordMessage(
      { content: `${clanEventBotCommand[type]} ${url} ${competitionKey}` },
      clanEventAnnouncementChannelId,
    );

    return 'sent';
  } catch (error) {
    console.error(
      `Failed to send the Discord command for clan event ${competitionId}:`,
      error,
    );

    return 'failed';
  }
}
