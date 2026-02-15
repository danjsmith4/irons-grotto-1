import { db } from '@/lib/db';
import { playerAcquiredItems } from '@/lib/db/schema';
import { desc } from 'drizzle-orm';

export async function fetchRecentClogUpdates() {
  try {
    const recentClogUpdates = await db
      .select({
        id: playerAcquiredItems.id,
        playerName: playerAcquiredItems.playerName,
        itemName: playerAcquiredItems.itemName,
        itemId: playerAcquiredItems.itemId,
        count: playerAcquiredItems.count,
        dateFirstLogged: playerAcquiredItems.dateFirstLogged,
      })
      .from(playerAcquiredItems)
      .orderBy(desc(playerAcquiredItems.dateFirstLogged))
      .limit(10);

    return { success: true, data: recentClogUpdates };
  } catch (error) {
    console.error('Failed to fetch recent clog updates:', error);
    return { success: false, error: String(error) };
  }
}
