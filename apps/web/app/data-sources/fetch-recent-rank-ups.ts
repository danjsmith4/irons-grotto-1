import { db } from '@/lib/db';
import { playerRankUps } from '@/lib/db/schema';
import { desc, isNotNull } from 'drizzle-orm';

export async function fetchRecentRankUps() {
  try {
    const recentRankUps = await db
      .select()
      .from(playerRankUps)
      .where(isNotNull(playerRankUps.oldRank)) // These are new recruits
      .orderBy(desc(playerRankUps.createdAt))
      .limit(10);

    return { success: true, data: recentRankUps };
  } catch (error) {
    console.error('Failed to fetch recent rank ups:', error);
    return { success: false, error: String(error) };
  }
}
