import {
  canPassCollectionLogGate,
  resolveCollectionLogState,
} from './resolve-collection-log-state';

const temple = (hiscoresClogSlots: number | null) => ({ hiscoresClogSlots });
const log = (clogSlots: number | null, hasCollectionLog = true) => ({
  hasCollectionLog,
  clogSlots,
});

describe('resolveCollectionLogState', () => {
  it('is ready when Temple matches the hiscores', () => {
    expect(resolveCollectionLogState(temple(1200), log(1200))).toEqual({
      status: 'ready',
    });
  });

  it('is ready when Temple is somehow ahead of the hiscores', () => {
    // The hiscores lag their own collection log ranking, so Temple being higher
    // is normal rather than a fault. Only Temple being *lower* means a stale
    // sync.
    expect(resolveCollectionLogState(temple(1180), log(1200))).toEqual({
      status: 'ready',
    });
  });

  it('is behind when Temple has fewer slots than the hiscores', () => {
    expect(resolveCollectionLogState(temple(1200), log(900))).toEqual({
      status: 'behind',
      templeSlots: 900,
      hiscoresSlots: 1200,
    });
  });

  it('is missing when Temple has no log at all', () => {
    expect(resolveCollectionLogState(temple(1200), log(null, false))).toEqual({
      status: 'missing',
    });
  });

  it('treats a log of zero slots as present rather than missing', () => {
    // A genuinely empty log is a real answer — a brand new account that has
    // synced. It must not be confused with Temple never having seen one.
    expect(resolveCollectionLogState(temple(0), log(0))).toEqual({
      status: 'ready',
    });
  });

  describe('when a source could not be read', () => {
    it('is unknown rather than behind when the hiscores count is missing', () => {
      expect(resolveCollectionLogState(temple(null), log(900))).toEqual({
        status: 'unknown',
      });
    });

    it('is unknown when there is no Temple scan at all', () => {
      expect(resolveCollectionLogState(null, log(900))).toEqual({
        status: 'unknown',
      });
    });

    it('is unknown when Temple answered without a slot count', () => {
      expect(resolveCollectionLogState(temple(1200), log(null))).toEqual({
        status: 'unknown',
      });
    });
  });
});

describe('canPassCollectionLogGate', () => {
  it('lets a ready log through', () => {
    expect(canPassCollectionLogGate({ status: 'ready' }, false)).toBe(true);
  });

  it('blocks a missing log', () => {
    expect(canPassCollectionLogGate({ status: 'missing' }, false)).toBe(false);
  });

  it('blocks a stale log', () => {
    expect(
      canPassCollectionLogGate(
        { status: 'behind', templeSlots: 900, hiscoresSlots: 1200 },
        false,
      ),
    ).toBe(false);
  });

  it('never blocks on an unreadable source', () => {
    // An unreachable third party is not evidence against the player.
    expect(canPassCollectionLogGate({ status: 'unknown' }, false)).toBe(true);
  });

  it.each([['missing'], ['behind']] as const)(
    'lets a mobile-only player past a %s log',
    (status) => {
      const state =
        status === 'behind'
          ? ({ status, templeSlots: 900, hiscoresSlots: 1200 } as const)
          : ({ status } as const);

      // The sync button is in RuneLite's TempleOSRS plugin. Mobile players
      // cannot press it, so blocking them is asking for the impossible.
      expect(canPassCollectionLogGate(state, true)).toBe(true);
    },
  );
});
