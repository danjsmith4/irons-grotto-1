import { server } from '@/mocks/server';
import { http, HttpResponse } from 'msw';
import { clientConstants } from '@/config/constants.client';
import { DroppedItemJSON, DroppedItemResponse } from '@/app/schemas/wiki';
import { z } from 'zod';
import { CollectionLogItemName } from '@/app/schemas/osrs';
import { RequiredItem } from '@/app/schemas/items';
import { ehbRates } from '../config/efficiency-rates';
import { pointsConfig } from '../config/points';
import {
  collectionLogItemBossNameMap,
  dropRateModifiers,
  groupSizes,
  pointModifiers,
  rewardItemBossNameMap,
} from '../config/item-point-map';
import { calculateItemPoints } from './calculate-item-points';
import {
  fetchItemDropRates,
  generateRequiredItemList,
} from '../data-sources/fetch-dropped-item-info';

type ItemResult = Omit<
  z.input<typeof DroppedItemJSON>,
  'Drop type' | 'Dropped item' | 'Alt Rarity'
> & { 'Alt Rarity'?: string };

type SetupItem = [itemName: CollectionLogItemName, results: ItemResult[]];

interface TestRequiredItem {
  clogName: CollectionLogItemName;
  results: NonEmptyArray<ItemResult>;
  targetDropSources?: [string];
  amount?: number;
  ignoreDropRateModifier?: true;
  ignoreAmountMultiplier?: true;
}

function setup(items: SetupItem[]) {
  const responseMock = items.reduce<z.input<typeof DroppedItemResponse>>(
    (acc, [itemName, results]) => {
      results.forEach(
        ({ 'Dropped from': dropSource, Rarity: rarity, ...data }) => {
          acc.bucket.push({
            drop_json: JSON.stringify({
              'Alt Rarity': '',
              ...data,
              Rarity: rarity,
              'Dropped from': dropSource,
              'Dropped item': itemName,
            } satisfies z.input<typeof DroppedItemJSON>),
          });
        },
      );

      return acc;
    },
    { bucket: [] },
  );

  server.use(
    http.get(`${clientConstants.wiki.baseUrl}/api.php`, () =>
      HttpResponse.json(responseMock),
    ),
  );
}

function parseRarity(rarity: string) {
  const [numerator, denominator] = rarity.replaceAll(',', '').split('/');

  return Number(numerator) / Number(denominator);
}

/**
 * A notable item is worth the time (in ironman EHB) it takes to obtain it:
 * roughly `dropRateDenominator / EHB`, scaled by points-per-hour and rounded up.
 *
 * This is a plain-arithmetic reference of that rule (the production code uses
 * Decimal). It is driven entirely by the live config — `ehbRates` plus the
 * drop-rate/point/group modifiers — so the tests assert the *relationship*
 * rather than hard-coded totals, and stay correct when EHB rates are refreshed.
 */
function expectedPoints(requiredItems: NonEmptyArray<TestRequiredItem>) {
  const raw = requiredItems.reduce((acc, item) => {
    const {
      clogName,
      amount = 1,
      results,
      ignoreDropRateModifier,
      ignoreAmountMultiplier,
    } = item;

    const dropSources =
      item.targetDropSources ?? results.map((r) => r['Dropped from']);

    const total = dropSources.reduce((sum, dropSource) => {
      const result = results.find((r) => r['Dropped from'] === dropSource)!;
      // The wiki transform stores rarity * rolls as the effective drop rate.
      const itemDropRate = parseRarity(result.Rarity) * (result.Rolls ?? 1);
      const bossName =
        collectionLogItemBossNameMap[clogName] ??
        rewardItemBossNameMap[dropSource] ??
        dropSource;
      const bossEhb = ehbRates[bossName];
      const dropRateModifier = ignoreDropRateModifier
        ? 1
        : (dropRateModifiers[dropSource] ?? 1);
      const pointModifier = pointModifiers[clogName] ?? 1;
      const groupSize = groupSizes[bossName] ?? 1;

      const points =
        (1 / ((itemDropRate * dropRateModifier) / groupSize) / bossEhb) *
        pointsConfig.notableItemsPointsPerHour *
        pointModifier *
        (ignoreAmountMultiplier ? 1 : amount);

      return sum + points;
    }, 0);

    return acc + total / dropSources.length;
  }, 0);

  return Math.ceil(raw);
}

/**
 * Each case declares the drop data; the expectation is derived, never a magic
 * number. `results` feeds both the mocked wiki response and the reference.
 */
const testCases = [
  {
    itemName: 'Berserker ring',
    requiredItems: [
      {
        clogName: 'Berserker ring',
        results: [
          { 'Dropped from': 'Dagannoth Rex', Rarity: '1/128', Rolls: 1 },
        ],
      },
    ],
  },
  {
    itemName: 'Abyssal orphan (Unsired drop-rate modifier)',
    requiredItems: [
      {
        clogName: 'Abyssal orphan',
        results: [{ 'Dropped from': 'Unsired', Rarity: '5/128', Rolls: 1 }],
      },
    ],
  },
  {
    itemName: "Hydra's claw",
    requiredItems: [
      {
        clogName: "Hydra's claw",
        results: [
          { 'Dropped from': 'Alchemical Hydra', Rarity: '1/1001', Rolls: 1 },
        ],
      },
    ],
  },
  {
    itemName: "Brimstone ring (Hydra's eye/fang/heart dupe point modifier)",
    requiredItems: [
      {
        clogName: "Hydra's eye",
        targetDropSources: ['Alchemical Hydra'],
        results: [
          { 'Dropped from': 'Alchemical Hydra', Rarity: '1/181', Rolls: 1 },
        ],
      },
      {
        clogName: "Hydra's fang",
        targetDropSources: ['Alchemical Hydra'],
        results: [
          { 'Dropped from': 'Alchemical Hydra', Rarity: '1/181', Rolls: 1 },
        ],
      },
      {
        clogName: "Hydra's heart",
        targetDropSources: ['Alchemical Hydra'],
        results: [
          { 'Dropped from': 'Alchemical Hydra', Rarity: '1/181', Rolls: 1 },
        ],
      },
    ],
  },
  {
    itemName: 'Ikkle hydra (pet)',
    requiredItems: [
      {
        clogName: 'Ikkle hydra',
        results: [
          { 'Dropped from': 'Alchemical Hydra', Rarity: '1/3000', Rolls: 1 },
        ],
      },
    ],
  },
  {
    itemName: 'Soulreaper axe (compound, four bosses)',
    requiredItems: [
      {
        clogName: "Leviathan's lure",
        results: [
          { 'Dropped from': 'The Leviathan', Rarity: '1/768', Rolls: 1 },
        ],
      },
      {
        clogName: "Siren's staff",
        results: [
          { 'Dropped from': 'The Whisperer', Rarity: '1/512', Rolls: 1 },
        ],
      },
      {
        clogName: "Executioner's axe head",
        results: [{ 'Dropped from': 'Vardorvis', Rarity: '1/1088', Rolls: 1 }],
      },
      {
        clogName: 'Eye of the duke',
        results: [
          { 'Dropped from': 'Duke Sucellus', Rarity: '1/720', Rolls: 1 },
        ],
      },
    ],
  },
] satisfies NonEmptyArray<{
  itemName: string;
  requiredItems: NonEmptyArray<TestRequiredItem>;
}>;

async function pointsFor(requiredItems: NonEmptyArray<TestRequiredItem>) {
  setup(
    requiredItems.map<SetupItem>(({ clogName, results }) => [
      clogName,
      results,
    ]),
  );

  const dropRates = await fetchItemDropRates([...generateRequiredItemList()]);

  return calculateItemPoints(
    dropRates,
    requiredItems.map((item) => ({
      amount: item.amount ?? 1,
      clogName: item.clogName,
      targetDropSources: item.targetDropSources,
      ignoreDropRateModifier: item.ignoreDropRateModifier,
      ignoreAmountMultiplier: item.ignoreAmountMultiplier,
    })) as NonEmptyArray<RequiredItem>,
  );
}

it.each(testCases)(
  'assigns "$itemName" the EHB-derived points',
  async ({ requiredItems }) => {
    const points = await pointsFor(requiredItems);

    expect(points).toEqual(expectedPoints(requiredItems));
  },
);

it('is worth (drop-rate denominator / IM EHB), rounded up', async () => {
  // Ikkle hydra: 1/3000 from Alchemical Hydra, no modifiers.
  const points = await pointsFor([
    {
      clogName: 'Ikkle hydra',
      results: [
        { 'Dropped from': 'Alchemical Hydra', Rarity: '1/3000', Rolls: 1 },
      ],
    },
  ]);

  expect(points).toBe(Math.ceil(3000 / ehbRates['Alchemical Hydra']));
});

it('gives a pet its (drop-rate denominator / IM EHB) points', async () => {
  // Pets are scored the same way as any other drop.
  const points = await pointsFor([
    {
      clogName: 'Pet kraken',
      results: [{ 'Dropped from': 'Kraken', Rarity: '1/3000', Rolls: 1 }],
    },
  ]);

  expect(points).toBe(Math.ceil(3000 / ehbRates.Kraken));
});

it('calculates the correct points when a specific drop source has been selected', async () => {
  const requiredItems = [
    {
      clogName: 'Abyssal dagger' as const,
      targetDropSources: ['Unsired'] as [string],
      results: [
        { 'Dropped from': 'Abyssal demon', Rarity: '1/32000', Rolls: 1 },
        { 'Dropped from': 'Unsired', Rarity: '26/128', Rolls: 1 },
      ] as NonEmptyArray<ItemResult>,
    },
  ] satisfies NonEmptyArray<TestRequiredItem>;

  const points = await pointsFor(requiredItems);

  expect(points).toEqual(expectedPoints(requiredItems));
});

it('finds the mean points for items dropped from multiple sources', async () => {
  const requiredItems = [
    {
      clogName: 'Virtus robe top' as const,
      results: [
        { 'Dropped from': 'Duke Sucellus', Rarity: '1/2,160', Rolls: 1 },
        { 'Dropped from': 'The Leviathan', Rarity: '1/2,304', Rolls: 1 },
        { 'Dropped from': 'The Whisperer', Rarity: '1/1,536', Rolls: 1 },
        { 'Dropped from': 'Vardorvis', Rarity: '1/3,264', Rolls: 1 },
      ] as NonEmptyArray<ItemResult>,
    },
  ] satisfies NonEmptyArray<TestRequiredItem>;

  const points = await pointsFor(requiredItems);

  expect(points).toEqual(expectedPoints(requiredItems));
});

it('divides the drop rate by the number of rolls per drop', async () => {
  const requiredItems = [
    {
      clogName: 'Granite hammer' as const,
      results: [
        { 'Dropped from': 'Grotesque Guardians', Rarity: '1/750', Rolls: 2 },
      ] as NonEmptyArray<ItemResult>,
    },
  ] satisfies NonEmptyArray<TestRequiredItem>;

  const points = await pointsFor(requiredItems);

  // Two rolls => effectively 1/375 => denominator halves.
  expect(points).toEqual(expectedPoints(requiredItems));
  expect(points).toBe(Math.ceil(375 / ehbRates['Grotesque Guardians']));
});

it('does not apply the drop-rate modifier when "ignoreDropRateModifier" is true', async () => {
  // Unsired carries a 1/100 drop-rate modifier; ignoring it makes the drop far
  // more common, so the item is worth far fewer points.
  const results = [
    { 'Dropped from': 'Unsired', Rarity: '26/128', Rolls: 1 },
  ] as NonEmptyArray<ItemResult>;
  const base = {
    clogName: 'Abyssal dagger' as const,
    targetDropSources: ['Unsired'] as [string],
    results,
  };

  const withModifier = await pointsFor([base]);
  const ignored = await pointsFor([{ ...base, ignoreDropRateModifier: true }]);

  expect(ignored).toEqual(
    expectedPoints([{ ...base, amount: 1, ignoreDropRateModifier: true }]),
  );
  expect(ignored).toBeLessThan(withModifier);
});

it('does not multiply the points by amount if "ignoreAmountMultiplier" is true', async () => {
  const results = [
    { 'Dropped from': 'Demonic gorilla', Rarity: '1/300', Rolls: 1 },
  ] as NonEmptyArray<ItemResult>;

  const points = await pointsFor([
    {
      clogName: 'Zenyte shard',
      results,
      amount: 2,
      ignoreAmountMultiplier: true,
    },
  ]);

  expect(points).toEqual(
    expectedPoints([
      {
        clogName: 'Zenyte shard',
        results,
        amount: 2,
        ignoreAmountMultiplier: true,
      },
    ]),
  );
});

it('multiplies the points by amount when "amount" > 1', async () => {
  const results = [
    { 'Dropped from': 'Demonic gorilla', Rarity: '1/300', Rolls: 1 },
  ] as NonEmptyArray<ItemResult>;

  const single = await pointsFor([{ clogName: 'Zenyte shard', results }]);
  const double = await pointsFor([
    { clogName: 'Zenyte shard', results, amount: 2 },
  ]);

  expect(double).toEqual(
    expectedPoints([{ clogName: 'Zenyte shard', results, amount: 2 }]),
  );
  // Roughly double the single-item points (modulo rounding).
  expect(double).toBeGreaterThan(single);
});
