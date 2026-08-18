import { db } from '@/lib/db';
import { players, playerAcquiredItems } from '@/lib/db/schema';
import { and, asc, eq, sql } from 'drizzle-orm';

export interface RareItem {
  itemName: string;
  itemId: number;
  owners: number;
  sampleOwner: string;
}

export interface CollectionLogInsights {
  rarest: RareItem[];
}

/**
 * "Rarest in the Grotto" — items logged by the fewest active members. Great for
 * surfacing prestige drops and one-of-a-kind achievements across the clan.
 */
export async function fetchCollectionLogInsights(
  limit = 14,
): Promise<
  | { success: true; data: CollectionLogInsights }
  | { success: false; error: string }
> {
  try {
    const rows = await db
      .select({
        itemName: playerAcquiredItems.itemName,
        itemId: playerAcquiredItems.itemId,
        owners: sql<number>`count(distinct ${playerAcquiredItems.playerName})::int`,
        sampleOwner: sql<string>`min(${playerAcquiredItems.playerName})`,
      })
      .from(playerAcquiredItems)
      .innerJoin(
        players,
        and(
          eq(players.playerName, playerAcquiredItems.playerName),
          eq(players.isActive, true),
        ),
      )
      .groupBy(playerAcquiredItems.itemName, playerAcquiredItems.itemId)
      .orderBy(
        asc(sql`count(distinct ${playerAcquiredItems.playerName})`),
        asc(playerAcquiredItems.itemName),
      )
      .limit(limit);

    return {
      success: true,
      data: {
        rarest: rows.map((r) => ({
          itemName: r.itemName,
          itemId: r.itemId,
          owners: Number(r.owners),
          sampleOwner: r.sampleOwner,
        })),
      },
    };
  } catch (error) {
    console.error('Failed to fetch collection log insights:', error);
    return { success: false, error: String(error) };
  }
}
