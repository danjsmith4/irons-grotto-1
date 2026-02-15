import { db } from '@/lib/db';
import { playerAcquiredItems } from '@/lib/db/schema';
import { inArray, desc } from 'drizzle-orm';

export interface UserRecentClogItem {
  playerName: string;
  itemName: string;
  itemId: number;
  itemCategory: string;
  dateFirstLogged: Date;
}

export async function fetchUserRecentClogs(
  playerNames: string[],
  limit = 20,
  offset = 0,
): Promise<
  | { success: true; data: UserRecentClogItem[] }
  | { success: false; error: string }
> {
  try {
    if (playerNames.length === 0) {
      return { success: true, data: [] };
    }

    const recentClogs = await db
      .select({
        playerName: playerAcquiredItems.playerName,
        itemName: playerAcquiredItems.itemName,
        itemId: playerAcquiredItems.itemId,
        itemCategory: playerAcquiredItems.itemCategory,
        dateFirstLogged: playerAcquiredItems.dateFirstLogged,
      })
      .from(playerAcquiredItems)
      .where(inArray(playerAcquiredItems.playerName, playerNames))
      .orderBy(desc(playerAcquiredItems.dateFirstLogged))
      .limit(limit)
      .offset(offset);

    return { success: true, data: recentClogs };
  } catch (error) {
    console.error('Failed to fetch user recent clogs:', error);
    return { success: false, error: String(error) };
  }
}
