import { server } from '@/mocks/server';
import { http, passthrough } from 'msw';
import { clientConstants } from '@/config/constants.client';
import { itemList } from '@/data/item-list';
import { isCollectionLogItem } from '@/app/schemas/items';
import { DroppedItemResponse } from '@/app/schemas/wiki';
import { CollectionLogItemName } from '@/app/schemas/osrs';
import { calculateItemPoints } from './calculate-item-points';
import { generateRequiredItemList } from '../data-sources/fetch-dropped-item-info';

// Throwaway debugging test: hits the LIVE wiki to reproduce exactly which
// notable items render "-" (hasPointsError) on the main page.
async function fetchLiveDropRates(items: CollectionLogItemName[]) {
  const batchSize = 80;
  const batches: string[] = [];

  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const queryConditions = batch.map((item) => `{"item_name","${item}"}`);
    batches.push(
      `bucket("dropsline").select("drop_json").where(bucket.Or(${queryConditions.join(',')})).run()`,
    );
  }

  const responses = await Promise.all(
    batches.map((query) => {
      const params = new URLSearchParams({
        action: 'bucket',
        format: 'json',
        query,
      });

      return fetch(`${clientConstants.wiki.baseUrl}/api.php?${params}`, {
        headers: { 'User-Agent': clientConstants.wiki.userAgent },
      }).then(async (res) => DroppedItemResponse.parse(await res.json()));
    }),
  );

  return responses.reduce((acc, val) => ({ ...acc, ...val }), {});
}

describe('debug zero-point items', () => {
  it('lists every item that throws during point calculation', async () => {
    server.use(
      http.get(`${clientConstants.wiki.baseUrl}/api.php`, () => passthrough()),
    );

    const dropRates = await fetchLiveDropRates([...generateRequiredItemList()]);

    const failures: { category: string; item: string; reason: string }[] = [];

    for (const [category, { items }] of Object.entries(itemList)) {
      for (const item of items) {
        if (item.points) continue;
        if (!isCollectionLogItem(item)) continue;

        try {
          calculateItemPoints(dropRates, item.requiredItems);
        } catch (error) {
          failures.push({
            category,
            item: item.name,
            reason: error instanceof Error ? error.message : String(error),
          });
        }
      }
    }

    // eslint-disable-next-line no-console
    console.log(
      `\n===== ITEMS RENDERING "-" (${failures.length}) =====\n` +
        failures
          .map((f) => `- [${f.category}] ${f.item} :: ${f.reason}`)
          .join('\n') +
        '\n===== END =====\n',
    );
  }, 120000);
});
