import { ItemCategoryMap } from '@/app/schemas/items';
import {
  buildPointsBreakdown,
  PointsBreakdownInput,
} from './build-points-breakdown';

const notableItemList = {
  'Tombs of Amascut': {
    items: [
      {
        name: "Tumeken's shadow",
        image: 'https://example.test/shadow.png',
        points: 900,
        hasPointsError: false,
        requiredItems: [{ clogName: "Tumeken's shadow (uncharged)", amount: 1 }],
        collectionLogCategories: ['tombs_of_amascut'],
      },
      {
        name: 'Elidinis ward',
        image: 'https://example.test/ward.png',
        points: 120,
        hasPointsError: false,
        requiredItems: [{ clogName: 'Elidinis ward', amount: 1 }],
        collectionLogCategories: ['tombs_of_amascut'],
      },
    ],
  },
} as unknown as ItemCategoryMap;

const baseInput: PointsBreakdownInput = {
  joinDate: new Date('2024-01-01'),
  ehb: 400,
  ehp: 200,
  totalLevel: 2000,
  combatAchievementTier: 'Hard',
  tzhaarCape: 'Fire cape',
  hasBloodTorva: false,
  hasRadiantOathplate: false,
  hasDizanasQuiver: false,
  hasAchievementDiaryCape: false,
  collectionLogCount: 800,
  collectionLogTotal: 1600,
  clueScrollCounts: {
    Beginner: 10,
    Easy: 20,
    Medium: 5,
    Hard: 3,
    Elite: 1,
    Master: 0,
  },
  achievementDiaries: { Ardougne: 'Elite', Desert: 'Medium' },
  acquiredItems: { "Tumekens shadow": true },
  combatBonusPoints: 0,
  skillingBonusPoints: 0,
  collectionLogBonusPoints: 0,
  notableItemsBonusPoints: 0,
};

describe('buildPointsBreakdown', () => {
  it('totals to the sum of its four categories', () => {
    const breakdown = buildPointsBreakdown(baseInput, notableItemList);

    expect(breakdown.categories).toHaveLength(4);
    expect(breakdown.totalPoints).toBe(
      breakdown.categories.reduce((total, { points }) => total + points, 0),
    );
  });

  it('emits a line only for the notable items the player holds', () => {
    const breakdown = buildPointsBreakdown(baseInput, notableItemList);
    const items = breakdown.lines.filter(({ category }) =>
      category === 'notableItems');

    // The bonus line is always present; the un-owned ward is not.
    expect(items.map(({ key }) => key)).toEqual([
      'notable-item:Tumekens shadow',
      'notable-items:bonus',
    ]);
    expect(items[0]).toMatchObject({
      label: "Tumeken's shadow",
      points: 900,
      image: 'https://example.test/shadow.png',
      detail: 'Tombs of Amascut',
    });
  });

  it('keys lines off the thing scored, never its value', () => {
    // Two players' ledgers are lined up on these keys, so a key that moved
    // with a value would compare a member's EHB against their own clue count.
    const breakdown = buildPointsBreakdown(baseInput, notableItemList);
    const other = buildPointsBreakdown(
      { ...baseInput, ehb: 1, combatAchievementTier: 'None' },
      notableItemList,
    );

    const keys = (lines: typeof breakdown.lines) => lines.map(({ key }) => key);

    expect(keys(breakdown.lines.filter(({ category }) => category === 'combat')))
      .toEqual(
        keys(other.lines.filter(({ category }) => category === 'combat')),
      );
  });

  it('itemises every diary location, including the ones not started', () => {
    const breakdown = buildPointsBreakdown(baseInput, notableItemList);
    const diaries = breakdown.lines.filter(({ key }) =>
      key.startsWith('skilling:diary:'));

    expect(diaries).toHaveLength(12);
    expect(
      diaries.find(({ key }) => key === 'skilling:diary:Ardougne'),
    ).toMatchObject({ detail: 'Elite' });
    expect(
      diaries.find(({ key }) => key === 'skilling:diary:Varrock'),
    ).toMatchObject({ detail: 'None', points: 0 });
  });

  it('itemises every clue tier, so a tier only one player runs still shows', () => {
    const breakdown = buildPointsBreakdown(baseInput, notableItemList);

    expect(
      breakdown.lines.filter(({ key }) =>
        key.startsWith('collection-log:clue:')),
    ).toHaveLength(6);
  });

  it('reports a notable-item bonus off the base it is a multiple of', () => {
    const breakdown = buildPointsBreakdown(
      { ...baseInput, notableItemsBonusPoints: 0.1 },
      notableItemList,
    );

    expect(
      breakdown.lines.find(({ key }) => key === 'notable-items:bonus')?.points,
    ).toBeCloseTo(90);
  });
});
