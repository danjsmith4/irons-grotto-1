import { db } from '@/lib/db';
import { playerAcquiredItems } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { stripEntityName } from '@/app/player/utils/strip-entity-name';

/**
 * The durable copy of a player's collection log.
 *
 * `player_acquired_items` accumulates every logged item a sync has ever seen,
 * and a collection log slot cannot be un-earned — so this is a **floor**, in
 * exactly the sense `player_derived_items` is one for the six items nothing
 * logs. It exists because the live TempleOSRS response is not always a superset
 * of it:
 *
 * - Temple's item **names drift** (the same hazard `DroppedItemResponse`
 *   re-casing exists for), so a row written under yesterday's spelling stops
 *   matching today's response;
 * - a request can come back partial, or for a subset of categories;
 * - Temple can simply be unreachable.
 *
 * Measured on a live member: Temple returned 543 items while 17 notable items
 * they demonstrably own — a ToA set, three pets, Soulreaper axe — were present
 * only in the stored rows. Scored without this floor their sheet came to 654
 * points less than their own record.
 *
 * ⚠️ Read this as "at least these", never as "exactly these". It is a floor,
 * not a replacement for the live read: the live response is what discovers
 * anything new.
 */
export async function getStoredCollectionLogCounts(
  playerName: string,
): Promise<Record<string, number>> {
  try {
    const rows = await db
      .select({
        itemName: playerAcquiredItems.itemName,
        count: playerAcquiredItems.count,
      })
      .from(playerAcquiredItems)
      .where(eq(playerAcquiredItems.playerName, playerName));

    return rows.reduce<Record<string, number>>(
      (acc, { itemName, count }) => ({
        ...acc,
        [stripEntityName(itemName)]: count,
      }),
      {},
    );
  } catch (error) {
    // Same reasoning as `getDerivedItems`: this sits on the calculator's load
    // path, and a safety net that can take down the page it protects is worse
    // than no net. An empty map is the state every player is in before their
    // first sync, which every caller already handles.
    console.error(
      'Failed to read the stored collection log, continuing without:',
      error,
    );

    return {};
  }
}
