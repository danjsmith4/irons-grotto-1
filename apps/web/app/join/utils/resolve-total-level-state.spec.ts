import { minimumJoinTotalLevel } from '@/config/clan-requirements';
import {
  canPassTotalLevelGate,
  resolveTotalLevelState,
} from './resolve-total-level-state';

describe('resolveTotalLevelState', () => {
  it('is met when both sources are above the minimum', () => {
    expect(resolveTotalLevelState(1800, 1800)).toEqual({
      status: 'met',
      totalLevel: 1800,
    });
  });

  it('is short when both sources are below it, with the shortfall', () => {
    expect(resolveTotalLevelState(1342, 1342)).toEqual({
      status: 'short',
      totalLevel: 1342,
      shortfall: minimumJoinTotalLevel - 1342,
    });
  });

  it('takes exactly the minimum as met', () => {
    // The rule is "from 1500", not "above 1500". A boundary that refuses the
    // number the clan advertises would be the worst possible one to get wrong.
    expect(resolveTotalLevelState(minimumJoinTotalLevel, null)).toEqual({
      status: 'met',
      totalLevel: minimumJoinTotalLevel,
    });
  });

  it('is short one level below the minimum', () => {
    expect(resolveTotalLevelState(minimumJoinTotalLevel - 1, null)).toEqual({
      status: 'short',
      totalLevel: minimumJoinTotalLevel - 1,
      shortfall: 1,
    });
  });

  describe('with the two sources disagreeing', () => {
    it('takes the higher when Temple is behind the hiscores', () => {
      // Temple's figure is whatever the player's last sync uploaded. A stale
      // one must never refuse someone who has actually trained past the line.
      expect(resolveTotalLevelState(1600, 1400)).toEqual({
        status: 'met',
        totalLevel: 1600,
      });
    });

    it('takes the higher when the hiscores are behind Temple', () => {
      expect(resolveTotalLevelState(1400, 1600)).toEqual({
        status: 'met',
        totalLevel: 1600,
      });
    });
  });

  describe('when a source could not be read', () => {
    it('uses Temple alone when the hiscores did not answer', () => {
      expect(resolveTotalLevelState(null, 1700)).toEqual({
        status: 'met',
        totalLevel: 1700,
      });
    });

    it('uses the hiscores alone when Temple did not answer', () => {
      expect(resolveTotalLevelState(1700, null)).toEqual({
        status: 'met',
        totalLevel: 1700,
      });
    });

    it('is unknown when neither answered', () => {
      // An unreachable third party is not evidence against the player. This is
      // the case that must never turn into a refused signup.
      expect(resolveTotalLevelState(null, null)).toEqual({ status: 'unknown' });
    });

    it('still reads a real zero as a reading, not as an absence', () => {
      // Only `null` means "no answer". A source that genuinely reported zero
      // has answered, and the answer fails.
      expect(resolveTotalLevelState(0, null)).toEqual({
        status: 'short',
        totalLevel: 0,
        shortfall: minimumJoinTotalLevel,
      });
    });
  });
});

describe('canPassTotalLevelGate', () => {
  it('lets a met account through', () => {
    expect(canPassTotalLevelGate({ status: 'met', totalLevel: 1800 })).toBe(
      true,
    );
  });

  it('blocks a short account', () => {
    expect(
      canPassTotalLevelGate({
        status: 'short',
        totalLevel: 1342,
        shortfall: 158,
      }),
    ).toBe(false);
  });

  it('never blocks on an unreadable source', () => {
    expect(canPassTotalLevelGate({ status: 'unknown' })).toBe(true);
  });
});
