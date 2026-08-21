import { db } from '@/lib/db';
import { playerAccomplishments, players } from '@/lib/db/schema';
import { and, desc, eq, sql } from 'drizzle-orm';
import {
  accomplishmentFeedSize,
  maxAccomplishmentsPerSync,
} from '@/config/accomplishments';

export interface RecentAccomplishment {
  id: string;
  playerName: string;
  type: (typeof playerAccomplishments.$inferSelect)['type'];
  label: string;
  achievedAt: Date;
}

/**
 * The clan's latest accomplishments, newest first.
 *
 * **Capped per sync.** Detection reports everything a player currently
 * qualifies for and stamps everything found in one run with a single
 * timestamp. So a member whose account has just been tracked for the first
 * time — or who has finally synced Temple after a year away — produces a burst
 * of rows sharing one `achieved_at`, and without a cap that one member fills
 * the feed.
 *
 * This is the same rule the collection-log rail already applies to a bulk clog
 * sync (`MAX_ITEMS_PER_SYNC` in `recent-clogs-scroller.tsx`), for the same
 * reason and keyed the same way: `(player, timestamp)`.
 *
 * Capping rather than hiding is deliberate. Those accomplishments are real, and
 * a new member's inferno cape is worth seeing — it just should not arrive as
 * forty rows at once. A cap also covers the case hiding never could: an
 * *existing* member syncing after a long gap, whose burst is not a first pass
 * at all and so would never have been marked as backfill.
 *
 * Mains are included — they are members, and this is not the ladder.
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
        achievedAt: playerAccomplishments.achievedAt,
      })
      .from(playerAccomplishments)
      .innerJoin(
        players,
        eq(players.playerName, playerAccomplishments.playerName),
      )
      .where(
        and(
          // Still in the clan.
          eq(players.isActive, true),
          // At most `maxAccomplishmentsPerSync` from any one detection run.
          // Ranked inside the group by id so the choice is stable between
          // requests, and applied here rather than by filtering the results in
          // JS — that would return fewer rows than the caller asked for.
          sql`(
            select count(*)
            from ${playerAccomplishments} as peer
            where peer.player_name = ${playerAccomplishments.playerName}
              and peer.achieved_at = ${playerAccomplishments.achievedAt}
              and peer.id <= ${playerAccomplishments.id}
          ) <= ${maxAccomplishmentsPerSync}`,
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
