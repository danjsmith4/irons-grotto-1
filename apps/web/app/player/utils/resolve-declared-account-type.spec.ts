import { http, HttpResponse } from 'msw';
import { server } from '@/mocks/server';
import { resolveDeclaredAccountType } from './resolve-declared-account-type';

const playerInfoUrl = 'https://templeosrs.com/api/player_info.php';
const addDatapointUrl = 'https://templeosrs.com/php/add_datapoint.php';

/**
 * Real `player_info.php` readings, taken 2026-08-22.
 *
 * `FriccKip` of `friccnhecc` — a group on Temple's GIM tracking — reports
 * `GIM 12`. `WhoKnowSteve` of `drippybros`, whose group is not tracked,
 * reports `0 / 0`: indistinguishable from a main, which is the whole reason
 * the player is asked and then sent to Temple.
 */
const readings = {
  trackedGroup: { 'Game mode': 0, GIM: 12 },
  trackedHardcoreGroup: { 'Game mode': 0, GIM: 22 },
  untrackedGroup: { 'Game mode': 0, GIM: 0 },
  soloIronman: { 'Game mode': 1, GIM: 0 },
} as const;

/** Temple knows the account and answers with this reading. */
function mockTemple(reading: (typeof readings)[keyof typeof readings]) {
  const addDatapoint = jest.fn();

  server.use(
    http.get(playerInfoUrl, () => HttpResponse.json({ data: reading })),
    http.get(addDatapointUrl, () => {
      addDatapoint();

      return HttpResponse.text('ok');
    }),
  );

  return { addDatapoint };
}

describe('resolveDeclaredAccountType', () => {
  it('confirms a tracked group against Temple, keeping the typed name as a label', async () => {
    mockTemple(readings.trackedGroup);

    await expect(
      resolveDeclaredAccountType('FriccKip', 'group_ironman', 'friccnhecc'),
    ).resolves.toEqual({
      status: 'resolved',
      accountType: 'group_ironman',
      gimGroupName: 'friccnhecc',
    });
  });

  it('takes hardcore from Temple, not from what the player picked', async () => {
    mockTemple(readings.trackedHardcoreGroup);

    await expect(
      resolveDeclaredAccountType('player', 'group_ironman', 'group'),
    ).resolves.toMatchObject({ accountType: 'hardcore_group_ironman' });
  });

  it('stores no group name when none was typed', async () => {
    mockTemple(readings.trackedGroup);

    await expect(
      resolveDeclaredAccountType('player', 'group_ironman', '   '),
    ).resolves.toMatchObject({ gimGroupName: null });
  });

  /**
   * The property that matters most here: a group Temple cannot see is never
   * quietly downgraded to unranked. Only the player can say which it was, and
   * adding the group to Temple is a thing they can go and do.
   */
  it('reports an untracked group rather than downgrading it to unranked', async () => {
    mockTemple(readings.untrackedGroup);

    await expect(
      resolveDeclaredAccountType('WhoKnowSteve', 'group_ironman', 'drippybros'),
    ).resolves.toEqual({ status: 'group-not-tracked' });
  });

  it('believes Temple only when it names a group mode', async () => {
    mockTemple(readings.soloIronman);

    await expect(
      resolveDeclaredAccountType('player', 'group_ironman', 'group'),
    ).resolves.toEqual({ status: 'group-not-tracked' });
  });

  it('asks Temple nothing for the two answers it cannot check', async () => {
    // A main and an unranked group are both unpublished: Temple reports them
    // identically to an untracked group, so there is nothing to confirm.
    const templeCall = jest.fn();

    server.use(
      http.get(playerInfoUrl, () => {
        templeCall();

        return HttpResponse.json({ data: readings.untrackedGroup });
      }),
    );

    await expect(resolveDeclaredAccountType('player', 'main')).resolves.toEqual(
      {
        status: 'resolved',
        accountType: 'main',
        gimGroupName: null,
      },
    );
    await expect(
      resolveDeclaredAccountType('player', 'unranked_group_ironman', 'group'),
    ).resolves.toMatchObject({ accountType: 'unranked_group_ironman' });

    expect(templeCall).not.toHaveBeenCalled();
  });

  /**
   * The hiscores are gone from this path on purpose — they only ever decided a
   * badge, since `rankThresholdsFor` branches on nothing but `isMainAccount`.
   */
  it('never touches the OSRS hiscores', async () => {
    const hiscoresCall = jest.fn();

    mockTemple(readings.trackedGroup);
    server.use(
      http.get('https://secure.runescape.com/*', () => {
        hiscoresCall();

        return HttpResponse.json({});
      }),
    );

    await resolveDeclaredAccountType('player', 'group_ironman', 'group');

    expect(hiscoresCall).not.toHaveBeenCalled();
  });

  it('does not re-register an account Temple already knows', async () => {
    const { addDatapoint } = mockTemple(readings.trackedGroup);

    await resolveDeclaredAccountType('player', 'group_ironman', 'group');

    expect(addDatapoint).not.toHaveBeenCalled();
  });
});
