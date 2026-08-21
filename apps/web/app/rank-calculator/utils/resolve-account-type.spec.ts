import { http, HttpResponse } from 'msw';
import { server } from '@/mocks/server';
import { AccountType } from '@/app/schemas/staff';
import { resolveAccountType } from './resolve-account-type';

const boards = {
  hardcore:
    'https://secure.runescape.com/m=hiscore_oldschool_hardcore_ironman/index_lite.json',
  ultimate:
    'https://secure.runescape.com/m=hiscore_oldschool_ultimate/index_lite.json',
  ironman:
    'https://secure.runescape.com/m=hiscore_oldschool_ironman/index_lite.json',
} as const;

type Board = keyof typeof boards;

/** Real readings, taken 2026-08-21. */
const templeReadings = {
  /** SirBurrows — the ironman this whole fix started with. */
  ironman: { 'Game mode': 1, GIM: 0 },
  hardcore: { 'Game mode': 3, GIM: 0 },
  /** A main *and* every group ironman Temple has not been told about. */
  main: { 'Game mode': 0, GIM: 0 },
} as const;

function mockBoards(listedOn: Board[]) {
  server.use(
    ...Object.entries(boards).map(([board, url]) =>
      http.get(url, () =>
        listedOn.includes(board as Board)
          ? HttpResponse.json({})
          : new HttpResponse(null, { status: 404 }),
      ),
    ),
  );
}

describe('resolveAccountType', () => {
  it('takes any non-main reading from Temple as authoritative', async () => {
    mockBoards([]);

    await expect(
      resolveAccountType('player', templeReadings.ironman),
    ).resolves.toEqual({
      status: 'resolved',
      accountType: 'ironman' satisfies AccountType,
      source: 'temple',
    });
  });

  it('settles a solo ironman TempleOSRS has never seen', async () => {
    mockBoards(['ironman']);

    await expect(resolveAccountType('player', null)).resolves.toEqual({
      status: 'resolved',
      accountType: 'ironman' satisfies AccountType,
      source: 'hiscores',
    });
  });

  it('prefers the specific board when an account is listed on two', async () => {
    mockBoards(['hardcore', 'ironman']);

    await expect(resolveAccountType('player', null)).resolves.toMatchObject({
      accountType: 'hardcore_ironman' satisfies AccountType,
    });
  });

  it('reads an ultimate ironman off its own board', async () => {
    mockBoards(['ultimate', 'ironman']);

    await expect(resolveAccountType('player', null)).resolves.toMatchObject({
      accountType: 'ultimate_ironman' satisfies AccountType,
    });
  });

  it('drops a dead hardcore ironman back to a plain ironman', async () => {
    mockBoards(['ironman']);

    await expect(resolveAccountType('player', null)).resolves.toMatchObject({
      accountType: 'ironman' satisfies AccountType,
    });
  });

  it("outranks Temple's ambiguous main reading with a board listing", async () => {
    mockBoards(['ironman']);

    await expect(
      resolveAccountType('player', templeReadings.main),
    ).resolves.toEqual({
      status: 'resolved',
      accountType: 'ironman' satisfies AccountType,
      source: 'hiscores',
    });
  });

  it('leaves an account no source can assert unresolved', async () => {
    mockBoards([]);

    await expect(
      resolveAccountType('player', templeReadings.main),
    ).resolves.toEqual({ status: 'unresolved' });
  });

  it('never infers a main, however little anything knows', async () => {
    mockBoards([]);

    const fromNothing = await resolveAccountType('player', null);
    const fromMainReading = await resolveAccountType(
      'player',
      templeReadings.main,
    );

    expect(fromNothing).not.toHaveProperty('accountType');
    expect(fromMainReading).not.toHaveProperty('accountType');
  });

  /**
   * The separation this file exists to keep: resolving a game mode is a read.
   * Registering an account on Temple is a different concern with a side effect
   * and a sleep, and belongs to `ensureTrackedOnTemple`.
   */
  it('never registers anything on TempleOSRS', async () => {
    const addDatapoint = jest.fn();

    mockBoards([]);
    server.use(
      http.get('https://templeosrs.com/php/add_datapoint.php', () => {
        addDatapoint();

        return HttpResponse.text('ok');
      }),
    );

    await resolveAccountType('player', null);

    expect(addDatapoint).not.toHaveBeenCalled();
  });
});
