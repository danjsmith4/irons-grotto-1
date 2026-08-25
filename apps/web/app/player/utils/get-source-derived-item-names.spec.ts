import { itemList } from '@/data/item-list';
import { ItemCategoryMap } from '@/app/schemas/items';
import { getSourceDerivedItemNames } from './get-source-derived-item-names';

describe('getSourceDerivedItemNames', () => {
  it('picks out exactly the items no collection log records', () => {
    // The real list, because the point of this function is what it says about
    // *our* data. If someone adds a quest or manual item, this list grows and
    // the test says so — which is the reminder that the new item needs a home
    // in `player_derived_items` too.
    expect(getSourceDerivedItemNames(itemList).sort()).toEqual(
      [
        '6 Jads',
        'Barrows gloves',
        'Book of the dead',
        'Mage Arena 2 cape',
        'Music cape',
        'Quest cape',
      ],
    );
  });

  it('leaves every collection log item out', () => {
    const derived = new Set(
      getSourceDerivedItemNames(itemList),
    );

    // A clog item already has a durable copy in `player_acquired_items`;
    // duplicating it here would give one item two homes that could disagree.
    expect(derived.has('Twisted bow')).toBe(false);
    expect(derived.has('Scythe of vitur')).toBe(false);
  });

  it('keys items the way the form does', () => {
    // `stripEntityName` drops apostrophes and full stops. The keys have to
    // match `acquiredItems` exactly or the floor lands under a name nothing
    // ever looks up.
    const derived = getSourceDerivedItemNames({
      test: {
        items: [
          { name: "Dizana's quiver", image: 'x', points: 1 },
          { name: 'Plain', image: 'x', points: 1 },
        ],
      },
    } as unknown as ItemCategoryMap);

    expect(derived).toEqual(['Dizanas quiver', 'Plain']);
  });
});
