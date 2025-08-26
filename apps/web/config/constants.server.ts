import 'server-only';
import { z } from 'zod';

const ServerConfigSchema = z.object({
  zeplo: z.object({
    apiKey: z.string(),
    url: z.string(),
  }),
  temple: z.object({
    groupName: z.string().nonempty(),
    groupId: z.string().nonempty(),
    groupKey: z.string().nonempty(),
    privateGroup: z.string().nonempty(),
  }),
  redisUrl: z.string().nonempty(),
  discord: z.object({
    token: z.string().nonempty(),
    guildId: z.string().nonempty(),
    channelId: z.string().nonempty(),
  }),
});

export const serverConstants = ServerConfigSchema.parse({
  zeplo: {
    apiKey: '',
    url: '',
  },
  temple: {
    groupName: process.env.TEMPLE_GROUP_NAME,
    groupId: process.env.TEMPLE_GROUP_ID,
    groupKey: process.env.TEMPLE_GROUP_KEY,
    privateGroup: process.env.TEMPLE_PRIVATE_GROUP,
  },
  redisUrl: process.env.KV_REST_API_URL,
  discord: {
    token: process.env.DISCORD_TOKEN,
    guildId: process.env.DISCORD_GUILD_ID,
    channelId: process.env.DISCORD_CHANNEL_ID,
  },
});
