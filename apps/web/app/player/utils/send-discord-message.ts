import 'server-only';
import {
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
