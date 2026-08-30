import { minimumJoinTotalLevel } from '@/config/clan-requirements';

/**
 * The server side of the minimum total level.
 *
 * Everything the action talks to is mocked, because what is under test is not
 * any of it — it is the *order*: that the gate is consulted, and that a refusal
 * stops short of `createNewPlayer`. The rule the gate applies is spec'd on its
 * own in `utils/resolve-total-level-state.spec.ts`.
 *
 * ⚠️ **This is the check that cannot be skipped by not using the browser.** The
 * join experience routes an under-level member to its own scene, so in practice
 * nobody reaches this — which is exactly why it needs a spec. A wiring mistake
 * here is invisible until someone posts the request by hand.
 */
const createNewPlayer = jest.fn<Promise<unknown>, [unknown]>();
const findPlayerRegistration = jest.fn<Promise<unknown>, [string]>();
const fetchHiscoresOverview = jest.fn<Promise<unknown>, [string]>();
const fetchTemplePlayerStats = jest.fn<Promise<unknown>, [string]>();
const ensureTrackedOnTemple = jest.fn<Promise<unknown>, [string]>();
const fetchPlayerMeta = jest.fn<Promise<unknown>, [string]>();
const resolveAccountType = jest.fn<Promise<unknown>, [unknown]>();

// Addressed relatively: `jest.mock` does not resolve the `@/` alias onto a
// module at the app root, the same quirk `join-experience.spec.tsx` documents
// for a path segment containing brackets.
jest.mock('../../../auth', () => ({
  auth: () => Promise.resolve({ user: { id: 'discord-1', permissions: [] } }),
}));
jest.mock('../../../lib/db/player-operations', () => ({
  createNewPlayer: (input: unknown) => createNewPlayer(input),
  findPlayerRegistration: (name: string) => findPlayerRegistration(name),
}));
jest.mock('../../player/validation/player-validation', () => ({
  fetchHiscoresOverview: (name: string) => fetchHiscoresOverview(name),
  // The schema's `playerName` refine calls this; the name itself is not what
  // this spec is about.
  validatePlayerExists: () => Promise.resolve(true),
}));
jest.mock('../../player/data-sources/fetch-temple-player-stats', () => ({
  fetchTemplePlayerStats: (name: string) => fetchTemplePlayerStats(name),
}));
jest.mock('../../player/data-sources/ensure-tracked-on-temple', () => ({
  ensureTrackedOnTemple: (name: string) => ensureTrackedOnTemple(name),
}));
jest.mock('../../player/data-sources/fetch-player-meta', () => ({
  fetchPlayerMeta: (name: string) => fetchPlayerMeta(name),
}));
jest.mock('../../player/utils/resolve-account-type', () => ({
  resolveAccountType: (info: unknown) => resolveAccountType(info),
}));

import { addPlayerAction } from './add-player-action';

const submit = () =>
  addPlayerAction({
    playerName: 'Riftletics',
    joinDate: new Date('2025-03-14T00:00:00.000Z'),
    isMobileOnly: false,
  });

beforeEach(() => {
  jest.clearAllMocks();
  findPlayerRegistration.mockResolvedValue(null);
  fetchPlayerMeta.mockResolvedValue({ rsn: 'Riftletics' });
  ensureTrackedOnTemple.mockResolvedValue({
    isTracked: true,
    didRegister: false,
    info: {},
  });
  resolveAccountType.mockResolvedValue({
    status: 'resolved',
    accountType: 'ironman',
  });
  createNewPlayer.mockResolvedValue(undefined);
});

describe('addPlayerAction and the clan minimum total level', () => {
  it('refuses an under-level account without creating a player', async () => {
    fetchHiscoresOverview.mockResolvedValue({ exists: true, totalLevel: 1342 });
    fetchTemplePlayerStats.mockResolvedValue({ Overall_level: 1342 });

    const result = await submit();

    expect(createNewPlayer).not.toHaveBeenCalled();
    expect(result?.validationErrors?.playerName?._errors?.join(' ')).toMatch(
      new RegExp(`${minimumJoinTotalLevel.toLocaleString()}`),
    );
  });

  it('creates the player when the account clears the minimum', async () => {
    fetchHiscoresOverview.mockResolvedValue({ exists: true, totalLevel: 1800 });
    fetchTemplePlayerStats.mockResolvedValue({ Overall_level: 1800 });

    await submit();

    expect(createNewPlayer).toHaveBeenCalledWith(
      expect.objectContaining({ playerName: 'Riftletics' }),
    );
  });

  it('reads the level itself rather than believing the request', async () => {
    // The browser cannot assert a total level: the field is not in the schema,
    // and a request carrying one is refused on what the sources actually say.
    fetchHiscoresOverview.mockResolvedValue({ exists: true, totalLevel: 1342 });
    fetchTemplePlayerStats.mockResolvedValue({ Overall_level: 1342 });

    const result = await addPlayerAction({
      playerName: 'Riftletics',
      joinDate: new Date('2025-03-14T00:00:00.000Z'),
      isMobileOnly: false,
      // Not part of `AddPlayerSchema` — ignored, and must not help.
      totalLevel: 2277,
    } as never);

    expect(createNewPlayer).not.toHaveBeenCalled();
    expect(result?.validationErrors?.playerName).toBeDefined();
  });

  it('lets the signup through when neither source could report a level', async () => {
    // An unreachable third party is not evidence against the player — the same
    // call the client makes.
    fetchHiscoresOverview.mockResolvedValue({ exists: true, totalLevel: null });
    fetchTemplePlayerStats.mockResolvedValue(null);

    await submit();

    expect(createNewPlayer).toHaveBeenCalled();
  });

  it('takes the higher reading when a stale Temple disagrees', async () => {
    fetchHiscoresOverview.mockResolvedValue({ exists: true, totalLevel: 1600 });
    fetchTemplePlayerStats.mockResolvedValue({ Overall_level: 1400 });

    await submit();

    expect(createNewPlayer).toHaveBeenCalled();
  });
});
