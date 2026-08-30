import { clientConstants } from '@/config/constants.client';
import { serverConstants } from '@/config/constants.server';
import { delay, http, HttpResponse, passthrough } from 'msw';
import { WikiSyncResponse } from '@/app/schemas/wiki';
import { ClanMember } from '@/app/schemas/inactivity-checker';
import { TempleOSRSPlayerStats } from '@/app/schemas/temple-api';
import type { ClanPointDistribution } from '@/app/data-sources/fetch-clan-point-distribution';
import type { RankPace } from '@/app/data-sources/fetch-rank-pace';
import * as wikiSync from './wiki-sync';
import * as templePlayerStats from './temple-player-stats';
import { memberListFixture } from './misc/member-list';
import { combatAchievementListFixture } from './wiki-data/combat-achievement-list';
import { combatAchievementTierFixture } from './wiki-data/combat-achievement-tiers';

const templePlayerStatsHandler = http.get(
  'https://templeosrs.com/api/player_stats.php',
  async ({ request }) => {
    const url = new URL(request.url);
    const player = url.searchParams.get('player');

    if (!player) {
      return HttpResponse.error();
    }

    await delay();

    switch (decodeURIComponent(player).toLowerCase()) {
      case 'riftletics':
        return HttpResponse.json<TempleOSRSPlayerStats>(
          templePlayerStats.earlyGamePlayerFixture,
        );
      case 'cousinofkos':
      case 'iron tyson':
        return HttpResponse.json<TempleOSRSPlayerStats>(
          templePlayerStats.midGamePlayerFixture,
        );
      case 'clogging':
        return HttpResponse.json<TempleOSRSPlayerStats>(
          templePlayerStats.endGamePlayerFixture,
        );
      default:
        return passthrough();
    }
  },
);

const wikiSyncHandler = http.get<{ player: string }>(
  `${clientConstants.wikiSync.baseUrl}/runelite/player/:player/STANDARD`,
  async ({ params }) => {
    await delay();

    switch (decodeURIComponent(params.player).toLowerCase()) {
      case 'riftletics':
        return HttpResponse.json<WikiSyncResponse>(
          wikiSync.earlyGamePlayerFixture,
        );
      case 'cousinofkos':
      case 'iron tyson':
        return HttpResponse.json<WikiSyncResponse>(
          wikiSync.midGamePlayerFixture,
        );
      case 'clogging':
        return HttpResponse.json<WikiSyncResponse>(
          wikiSync.endGamePlayerFixture,
        );
      default:
        return passthrough();
    }
  },
);

const wikiApiHandler = http.get(
  `${clientConstants.wiki.baseUrl}/api.php`,
  ({ request }) => {
    if (request.url.includes('Combat+Achievement+JSON')) {
      return HttpResponse.json(combatAchievementListFixture);
    }

    if (request.url.includes('ca+easy+points')) {
      return HttpResponse.json(combatAchievementTierFixture);
    }

    throw new Error(`No mock provided for ${request.url}`);
  },
);

/**
 * The OSRS hiscores.
 *
 * Mocked rather than passed through since `fetchHiscoresOverview` started
 * reading the response body for the player's total level: a passthrough here
 * means a live network call on every spec that touches player validation, and
 * a flaky third party deciding whether the suite goes green.
 *
 * `Overall` leads the list as it does in the real response. The level is above
 * the clan's minimum so that existing specs, which only ever cared whether the
 * name resolved, keep passing the total-level gate as they always did.
 */
const hiscoresHandler = http.get(
  'https://secure.runescape.com/m=hiscore_oldschool/index_lite.json',
  ({ request }) => {
    const player = new URL(request.url).searchParams.get('player');

    if (!player) {
      return HttpResponse.error();
    }

    if (decodeURIComponent(player).toLowerCase() === 'nonexistentplayer') {
      return new HttpResponse(null, { status: 404 });
    }

    return HttpResponse.json({
      skills: [
        { id: 0, name: 'Overall', rank: 12345, level: 1800, xp: 100000000 },
        { id: 1, name: 'Attack', rank: 12345, level: 99, xp: 13034431 },
      ],
      activities: [],
    });
  },
);

const memberListHandler = http.get(
  'https://*.public.blob.vercel-storage.com/members-*.json',
  () => HttpResponse.json<ClanMember[]>(memberListFixture),
);

// The rank calculator asks for this on every load to place a player against
// the clan. A fixed curve keeps the standing chip deterministic in tests.
const clanPointDistributionHandler = http.get(
  '*/api/clan-point-distribution',
  () =>
    HttpResponse.json<{ success: true; data: ClanPointDistribution }>({
      success: true,
      data: {
        points: [9000, 7000, 5000, 3000, 1000],
        memberCount: 6,
      },
    }),
);

// Rank pace for the scoreboard's "at this rank for X" strip.
const rankPaceHandler = http.get('*/api/rank-pace', () =>
  HttpResponse.json<{ success: true; data: RankPace }>({
    success: true,
    data: {
      history: [
        {
          oldRank: 'Recruit',
          newRank: 'Corporal',
          createdAt: '2026-06-01T00:00:00.000Z',
        },
      ],
      joinDate: '2025-01-01',
      clanPaceByRank: { Corporal: { medianDays: 60, sampleSize: 8 } },
    },
  }),
);

const passthroughHandlers = [
  'https://*.googleapis.com/*',
  'https://*.gstatic.com/*',
  `${clientConstants.publicUrl}/api/*`,
  'https://oldschool.runescape.wiki/images/*',
  'https://templeosrs.com/api/group_member_info.php',
  'https://discord.com/api/users/@me',
  'https://discord.com/api/oauth2/token',
  'https://discord.com/api/v10/channels/*/messages',
  `${serverConstants.redisUrl}/*`,
  'https://*.sentry.io/*',
  'https://telemetry.nextjs.org/*',
  'http://localhost:3000/__nextjs_original-stack-frame',
  'http://localhost:8969/*',
  'http://localhost:42399/*',
].map((url) => http.all(url, passthrough));

export const handlers = [
  wikiSyncHandler,
  templePlayerStatsHandler,
  hiscoresHandler,
  memberListHandler,
  wikiApiHandler,
  clanPointDistributionHandler,
  rankPaceHandler,
  ...passthroughHandlers,
];
