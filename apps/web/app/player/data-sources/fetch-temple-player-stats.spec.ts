import { http, HttpResponse } from 'msw';
import { server } from '@/mocks/server';
import { earlyGamePlayerFixture } from '@/mocks/temple-player-stats';
import { fetchTemplePlayerStats } from './fetch-temple-player-stats';

/**
 * Guards the regression that broke every ironman signup.
 *
 * `player_stats.php?bosses=0` answers without `info.Primary_ehb`, the EHB
 * totals, `Collections`, `TzKal-Zuk` or any `Clue_*` — thirteen fields
 * `TempleOSRSPlayerStats` requires. The parse threw, the catch turned that into
 * a null, and callers read the null as "Temple does not know this player",
 * which `add-player-action` then treated as a main account.
 *
 * The handler below reproduces that asymmetry, so reintroducing a `bosses=0`
 * request fails here rather than in production.
 */
function mockTempleStats(requested: string[] = []) {
  server.use(
    http.get('https://templeosrs.com/api/player_stats.php', ({ request }) => {
      const bosses = new URL(request.url).searchParams.get('bosses');

      requested.push(bosses ?? '');

      if (bosses !== '1') {
        const { info, ...rest } = earlyGamePlayerFixture.data;
        const {
          Primary_ehb: unusedPrimaryEhb,
          ...infoWithoutBossFields
        } = info;
        const {
          Ehb: unusedEhb,
          Im_ehb: unusedImEhb,
          Uim_ehb: unusedUimEhb,
          Collections: unusedCollections,
          'TzKal-Zuk': unusedZuk,
          Clue_all: unusedClueAll,
          Clue_beginner: unusedClueBeginner,
          Clue_easy: unusedClueEasy,
          Clue_medium: unusedClueMedium,
          Clue_hard: unusedClueHard,
          Clue_elite: unusedClueElite,
          Clue_master: unusedClueMaster,
          ...dataWithoutBossFields
        } = rest;

        return HttpResponse.json({
          data: { ...dataWithoutBossFields, info: infoWithoutBossFields },
        });
      }

      return HttpResponse.json(earlyGamePlayerFixture);
    }),
  );
}

describe('fetchTemplePlayerStats', () => {
  it('requests the only response shape its schema can parse', async () => {
    const requested: string[] = [];

    mockTempleStats(requested);

    await fetchTemplePlayerStats('Riftletics');

    expect(requested).toEqual(['1']);
  });

  it('returns the parsed stats rather than a silent null', async () => {
    mockTempleStats();

    await expect(fetchTemplePlayerStats('Riftletics')).resolves.toMatchObject({
      info: { 'Game mode': 1, GIM: 0 },
    });
  });
});
