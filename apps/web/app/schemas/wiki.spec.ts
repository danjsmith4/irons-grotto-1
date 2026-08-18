import { DroppedItemResponse } from './wiki';

interface DropRow {
  itemName: string;
  dropSource: string;
  rarity: string;
  rolls?: number;
  altRarity?: string;
}

function buildResponse(rows: DropRow[]) {
  return {
    bucket: rows.map(
      ({ itemName, dropSource, rarity, rolls = 1, altRarity = '' }) => ({
        drop_json: JSON.stringify({
          Rarity: rarity,
          'Alt Rarity': altRarity,
          'Dropped from': dropSource,
          'Dropped item': itemName,
          Rolls: rolls,
        }),
      }),
    ),
  };
}

describe('DroppedItemResponse item-name canonicalisation', () => {
  it('re-cases drifted title-case wiki names back to the canonical clog name', () => {
    // The wiki now returns pet names in title case (e.g. "Pet Snakeling").
    const result = DroppedItemResponse.parse(
      buildResponse([
        { itemName: 'Pet Snakeling', dropSource: 'Zulrah', rarity: '1/4000' },
      ]),
    );

    expect(result['Pet snakeling']).toBeDefined();
    expect(result['Pet Snakeling']).toBeUndefined();
    expect(result['Pet snakeling'].Zulrah).toBeCloseTo(1 / 4000);
  });

  it('applies rarity overrides after canonicalising the name', () => {
    // "TzRek-Jad" -> canonical "Tzrek-jad", which has a rarity override of 1/67.
    const result = DroppedItemResponse.parse(
      buildResponse([
        { itemName: 'TzRek-Jad', dropSource: 'TzTok-Jad', rarity: '1/200' },
      ]),
    );

    expect(result['Tzrek-jad']['TzTok-Jad']).toBeCloseTo(1 / 67);
  });

  it('leaves already-correct names untouched', () => {
    const result = DroppedItemResponse.parse(
      buildResponse([
        {
          itemName: 'Berserker ring',
          dropSource: 'Dagannoth Rex',
          rarity: '1/128',
        },
      ]),
    );

    expect(result['Berserker ring']['Dagannoth Rex']).toBeCloseTo(1 / 128);
  });
});
