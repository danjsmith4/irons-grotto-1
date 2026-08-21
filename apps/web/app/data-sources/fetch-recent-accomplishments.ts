import { db } from '@/lib/db';
import { playerAccomplishments, players } from '@/lib/db/schema';
import { and, desc, eq } from 'drizzle-orm';
import { accomplishmentFeedSize } from '@/config/accomplishments';

export interface RecentAccomplishment {
  id: string;
  playerName: string;
  type: (typeof playerAccomplishments.$inferSelect)['type'];
  label: string;
  iconItemName: string | null;
  achievedAt: Date;
}

/**
 * The clan's latest accomplishments, newest first.
 *
 * Backfilled rows are excluded: they are real accomplishments, but they were
 * found in a player's first detection pass and we have no idea when they
 * happened, so they are not news. Mains are included — they are members, and
 * this is not the ladder.
 */
export async function fetchRecentAccomplishments(
  limit = accomplishmentFeedSize,
) {
  try {
    const recentAccomplishments = await db
      .select({
        id: playerAccomplishments.id,
        playerName: playerAccomplishments.playerName,
        type: playerAccomplishments.type,
        label: playerAccomplishments.label,
        iconItemName: playerAccomplishments.iconItemName,
        achievedAt: playerAccomplishments.achievedAt,
      })
      .from(playerAccomplishments)
      .innerJoin(
        players,
        eq(players.playerName, playerAccomplishments.playerName),
      )
      .where(
        and(
          // Still in the clan...
          eq(players.isActive, true),
          // ...and not something we merely noticed on their first pass.
          eq(playerAccomplishments.isBackfilled, false),
        ),
      )
      .orderBy(desc(playerAccomplishments.achievedAt))
      .limit(limit);

    return { success: true, data: recentAccomplishments };
  } catch (error) {
    console.error('Failed to fetch recent accomplishments:', error);
    return { success: false, error: String(error) };
  }
}
