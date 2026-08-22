import type { RankSubmissionDiff } from '@/app/schemas/rank-calculator';
import { isAutoApprovable } from './submission-operations';

const allSourcesPresent = {
  hasTemplePlayerStats: true,
  hasTempleCollectionLog: true,
  hasWikiSyncData: true,
  isTempleCollectionLogOutdated: false,
};

const noDiscrepancy: RankSubmissionDiff = {
  achievementDiaries: null,
  acquiredItems: null,
  combatAchievementTier: null,
  totalLevel: null,
  collectionLogCount: null,
  tzhaarCape: null,
  hasBloodTorva: null,
  hasDizanasQuiver: null,
  hasAchievementDiaryCape: null,
};

describe('isAutoApprovable', () => {
  it('approves when every source is present and agrees', () => {
    expect(isAutoApprovable(allSourcesPresent, noDiscrepancy)).toBe(true);
  });

  it.each([
    'hasTemplePlayerStats',
    'hasTempleCollectionLog',
    'hasWikiSyncData',
  ] as const)('refuses when %s is missing', (flag) => {
    expect(
      isAutoApprovable({ ...allSourcesPresent, [flag]: false }, noDiscrepancy),
    ).toBe(false);
  });

  it('refuses on a stale collection log', () => {
    expect(
      isAutoApprovable(
        { ...allSourcesPresent, isTempleCollectionLogOutdated: true },
        noDiscrepancy,
      ),
    ).toBe(false);
  });

  /**
   * The reason this predicate exists: a claim no source can back up has to
   * reach a human. Each diff field has a different shape, so each is guarded.
   */
  it('refuses on an unverified boolean claim', () => {
    expect(
      isAutoApprovable(allSourcesPresent, {
        ...noDiscrepancy,
        hasBloodTorva: true,
      }),
    ).toBe(false);
  });

  it('refuses on a claimed item no source explains', () => {
    expect(
      isAutoApprovable(allSourcesPresent, {
        ...noDiscrepancy,
        acquiredItems: ['Dragon defender'],
      }),
    ).toBe(false);
  });

  it('refuses on a diary the sources rank lower', () => {
    expect(
      isAutoApprovable(allSourcesPresent, {
        ...noDiscrepancy,
        achievementDiaries: { Morytania: 'Hard' },
      }),
    ).toBe(false);
  });

  /** An empty array or map is agreement, not a discrepancy. */
  it('treats empty collections as no discrepancy', () => {
    expect(
      isAutoApprovable(allSourcesPresent, {
        ...noDiscrepancy,
        acquiredItems: [],
        achievementDiaries: {},
      }),
    ).toBe(true);
  });
});
