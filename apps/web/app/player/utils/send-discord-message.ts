import 'server-only';
import {
  APIDMChannel,
  APIMessage,
  RESTPostAPIChannelMessageJSONBody,
  Routes,
} from 'discord-api-types/v10';
import { discordBotClient } from '@/discord';

export async function sendDiscordMessage(
  message: RESTPostAPIChannelMessageJSONBody,
  channelId: string,
): Promise<APIMessage> {
  const response = await discordBotClient.post(
    Routes.channelMessages(channelId),
    { body: message },
  );

  return response as APIMessage;
}

/**
 * DMs a user. Discord needs the DM channel opened first; doing so for a user
 * who already has one returns the existing channel, so this is safe to repeat.
 *
 * Throws when the user does not accept DMs from the bot (code 50007) — which
 * is a setting members are entitled to, so callers should treat it as an
 * outcome rather than an outage.
 */
export async function sendDiscordDirectMessage(
  message: RESTPostAPIChannelMessageJSONBody,
  userId: string,
): Promise<APIMessage> {
  const { id: dmChannelId } = (await discordBotClient.post(
    Routes.userChannels(),
    { body: { recipient_id: userId } },
  )) as APIDMChannel;

  return sendDiscordMessage(message, dmChannelId);
}
