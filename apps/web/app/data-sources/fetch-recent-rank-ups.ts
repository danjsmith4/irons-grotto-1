import { db } from '@/lib/db';
import { playerRankUps } from '@/lib/db/schema';
import { desc, eq, not } from 'drizzle-orm';

export async function fetchRecentRankUps() {
  try {
    const recentRankUps = await db
      .select()
      .from(playerRankUps)
      .where(not(eq(playerRankUps.oldRank, 'Unranked'))) // These are new recruits
      .orderBy(desc(playerRankUps.createdAt))
      .limit(10);

    return { success: true, data: recentRankUps };
  } catch (error) {
    console.error('Failed to fetch recent rank ups:', error);
    return { success: false, error: String(error) };
  }
}
