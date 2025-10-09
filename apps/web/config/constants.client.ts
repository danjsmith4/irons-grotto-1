import { z } from 'zod';
import { Rank } from './enums';

const ClientConfigSchema = z.object({
  publicUrl: z.string(),
  temple: z.object({
    baseUrl: z.literal('https://templeosrs.com'),
  }),
  ranks: z.object({
    leaders: z.array(Rank).nonempty(),
    unranked: Rank,
  }),
  wiki: z.object({
    baseUrl: z.literal('https://oldschool.runescape.wiki'),
    userAgent: z.literal('Irons-Grotto-Rank-Calculator (Discord @avios)'),
    queryLimit: z.number().int().min(1).max(5000),
  }),
  wikiSync: z.object({
    baseUrl: z.literal('https://sync.runescape.wiki'),
  }),
  discord: z.object({
    baseUrl: z.literal('https://discord.com/api/v10'),
  }),
  bingo: z.object({
    password: z.string(),
  }),
});

export const clientConstants = ClientConfigSchema.parse({
  publicUrl: process.env.NEXT_PUBLIC_URL,
  temple: {
    baseUrl: 'https://templeosrs.com',
  },
  ranks: {
    leaders: ['Owner', 'Deputy Owner', 'Artisan'],
    unranked: 'Air',
  },
  wiki: {
    baseUrl: 'https://oldschool.runescape.wiki',
    userAgent: 'Irons-Grotto-Rank-Calculator (Discord @avios)',
    queryLimit: 5000
  },
  wikiSync: {
    baseUrl: 'https://sync.runescape.wiki',
  },
  discord: {
    baseUrl: 'https://discord.com/api/v10',
  },
  bingo: {
    password: 'bingo2025clanvclan', // You can change this to your desired password
  },
});
