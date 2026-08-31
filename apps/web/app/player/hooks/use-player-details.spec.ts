import { QueryClient } from '@tanstack/react-query';
import {
  patchPlayerDetailsCache,
  playerDetailsQueryKey,
  type PlayerDetailsResult,
} from './use-player-details';

const playerName = 'Test Player';

function cachedSheet(): PlayerDetailsResult {
  return {
    success: true,
    data: {
      playerName,
      joinDate: '2024-01-01T00:00:00.000Z',
      acquiredItems: { 'Tumeken&#39;s shadow': true },
      proofLink: 'https://example.com/before',
      hasBloodTorva: false,
      totalLevel: 2277,
    } as unknown as Extract<PlayerDetailsResult, { success: true }>['data'],
  };
}

describe('patchPlayerDetailsCache', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient();
  });

  /**
   * The whole reason this function exists. The cached sheet is served without a
   * refetch while it is fresh, so a write that does not reach it would hand the
   * member back a snapshot from before their own edit the next time they opened
   * the calculator.
   */
  it('carries a stored patch onto the cached sheet', () => {
    queryClient.setQueryData(playerDetailsQueryKey(playerName), cachedSheet());

    patchPlayerDetailsCache(queryClient, playerName, {
      hasBloodTorva: true,
      proofLink: 'https://example.com/after',
    });

    const result = queryClient.getQueryData<PlayerDetailsResult>(
      playerDetailsQueryKey(playerName),
    );

    expect(result).toMatchObject({
      success: true,
      data: {
        hasBloodTorva: true,
        proofLink: 'https://example.com/after',
        // Untouched fields survive: the patch is a delta, not a replacement.
        totalLevel: 2277,
        playerName,
      },
    });
  });

  it('replaces an object field wholesale rather than merging into it', () => {
    queryClient.setQueryData(playerDetailsQueryKey(playerName), cachedSheet());

    patchPlayerDetailsCache(queryClient, playerName, {
      acquiredItems: { Elysian_spirit_shield: true },
    });

    const result = queryClient.getQueryData<PlayerDetailsResult>(
      playerDetailsQueryKey(playerName),
    );

    // Matches the server: `updatePlayerEditableFields` stores the map it is
    // given, so an item unticked to nothing must not be resurrected here.
    expect(result?.success ? result.data.acquiredItems : null).toStrictEqual({
      Elysian_spirit_shield: true,
    });
  });

  it('leaves a cached failure alone', () => {
    const failure: PlayerDetailsResult = { success: false, error: 'nope' };

    queryClient.setQueryData(playerDetailsQueryKey(playerName), failure);

    patchPlayerDetailsCache(queryClient, playerName, { hasBloodTorva: true });

    expect(
      queryClient.getQueryData<PlayerDetailsResult>(
        playerDetailsQueryKey(playerName),
      ),
    ).toStrictEqual(failure);
  });

  /**
   * A write can land before anything has warmed the cache — nothing to patch is
   * a normal outcome, and inventing an entry would leave a half-built sheet for
   * the next visit to mount.
   */
  it('does not create an entry when nothing is cached', () => {
    patchPlayerDetailsCache(queryClient, playerName, { hasBloodTorva: true });

    expect(
      queryClient.getQueryData(playerDetailsQueryKey(playerName)),
    ).toBeUndefined();
  });
});
