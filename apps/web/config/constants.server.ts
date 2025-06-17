import 'server-only';
import { z } from 'zod';

const ServerConfigSchema = z.object({
  redisUrl: z.string(),
  discord: z.object({
    token: z.string(),
    guildId: z.string(),
    channelId: z.string(),
  }),
});

export const serverConstants = ServerConfigSchema.parse({
  redisUrl: process.env.KV_REST_API_URL,
  discord: {
    token: process.env.DISCORD_TOKEN,
    guildId: process.env.DISCORD_GUILD_ID,
    channelId: process.env.DISCORD_CHANNEL_ID,
  },
});
