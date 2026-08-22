import { ItemCategoryMap } from '@/app/schemas/items';
import { buildStoredAcquiredItems } from './fetch-player-comparison';

/**
 * A clog item and an unlogged one, which are the two cases that resolve
 * differently.
 */
const notableItemList = {
  Misc: {
    items: [
      {
        name: 'Twisted bow',
        image: 'x',
        points: 100,
        hasPointsError: false,
        requiredItems: [{ clogName: 'Twisted bow', amount: 1 }],
        collectionLogCategories: ['chambers_of_xeric'],
      },
      { name: 'Quest cape', image: 'x', points: 100 },
    ],
  },
} as unknown as ItemCategoryMap;

const noClog: Record<string, number> = {};
const noDerived: Record<string, boolean> = {};
const noOverrides: Record<string, boolean> = {};

describe('buildStoredAcquiredItems', () => {
  it('settles a logged item from the collection log', () => {
    expect(
      buildStoredAcquiredItems(
        notableItemList,
        { 'Twisted bow': 1 },
        noDerived,
        noOverrides,
      ),
    ).toMatchObject({ 'Twisted bow': true });
  });

  it('settles an unlogged item from player_derived_items', () => {
    // The whole point of the table: nothing logs a Quest cape, so without this
    // the ledger scored it as missing for everyone and came up 480 short.
    expect(
      buildStoredAcquiredItems(
        notableItemList,
        noClog,
        { 'Quest cape': true },
        noOverrides,
      ),
    ).toMatchObject({ 'Quest cape': true });
  });

  it('treats a stored false as an answer, not a gap', () => {
    // `??` not `||`. A recorded "the source says no" must not fall through to
    // the collection log derivation and get a second opinion.
    expect(
      buildStoredAcquiredItems(
        notableItemList,
        { 'Twisted bow': 1 },
        { 'Twisted bow': false },
        noOverrides,
      ),
    ).toMatchObject({ 'Twisted bow': false });
  });

  it('leaves an unlogged item unheld when nothing has been stored for it', () => {
    // A missing row is "never read", and there is nothing else that can settle
    // it — so the honest answer is no, and it is the state every player is in
    // until their first sync after the table shipped.
    expect(
      buildStoredAcquiredItems(
        notableItemList,
        noClog,
        noDerived,
        noOverrides,
      ),
    ).toMatchObject({ 'Quest cape': false });
  });

  it('lets the player override both sources', () => {
    expect(
      buildStoredAcquiredItems(
        notableItemList,
        noClog,
        { 'Quest cape': false },
        { 'Quest cape': true },
      ),
    ).toMatchObject({ 'Quest cape': true });
  });

  it('lets an override untick something a source reports', () => {
    expect(
      buildStoredAcquiredItems(
        notableItemList,
        { 'Twisted bow': 1 },
        noDerived,
        { 'Twisted bow': false },
      ),
    ).toMatchObject({ 'Twisted bow': false });
  });
});
