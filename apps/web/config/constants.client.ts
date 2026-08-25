import { z } from 'zod';
import { Rank } from './enums';

const ClientConfigSchema = z.object({
  publicUrl: z.string(),
  temple: z.object({
    baseUrl: z.literal('https://templeosrs.com'),
    /**
     * Where a group ironman is sent to get their group onto Temple's GIM
     * tracking, which is the one thing that makes Temple able to tell them
     * apart from a main.
     *
     * `tracking.php`, not `leaderboards.php` — the leaderboards page only lists
     * groups Temple already tracks, so it is the last place that helps someone
     * whose group is missing from it.
     */
    gimTrackingUrl: z.literal('https://templeosrs.com/gim/tracking.php'),
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
});

export const clientConstants = ClientConfigSchema.parse({
  publicUrl: process.env.NEXT_PUBLIC_URL,
  temple: {
    baseUrl: 'https://templeosrs.com',
    gimTrackingUrl: 'https://templeosrs.com/gim/tracking.php',
  },
  ranks: {
    leaders: ['Owner', 'Deputy Owner', 'Artisan'],
    unranked: 'Air',
  },
  wiki: {
    baseUrl: 'https://oldschool.runescape.wiki',
    userAgent: 'Irons-Grotto-Rank-Calculator (Discord @avios)',
    queryLimit: 5000,
  },
  wikiSync: {
    baseUrl: 'https://sync.runescape.wiki',
  },
  discord: {
    baseUrl: 'https://discord.com/api/v10',
  },
});
