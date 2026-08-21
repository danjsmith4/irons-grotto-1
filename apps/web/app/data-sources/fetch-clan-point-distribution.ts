import { db } from '@/lib/db';
import { players } from '@/lib/db/schema';
import { rankedMember } from '@/lib/db/player-filters';
import { and, desc, ne } from 'drizzle-orm';

export interface ClanPointDistribution {
  /**
   * Every *other* active member's points, descending. Small enough to ship whole (a
   * clan is hundreds of members, not millions), which lets the calculator
   * recompute a player's standing live as they tick items — no roundtrip per
   * keystroke.
   */
  points: number[];
  /** Active members counted, including the excluded player. */
  memberCount: number;
}

/**
 * The clan-wide points curve, used to place a submission against the rest of
 * the Grotto. Ranked members only, matching the leaderboard's filter — a main
 * in the pool would shift every ironman's percentile.
 */
export async function fetchClanPointDistribution(
  /**
   * The player being calculated. Their stored row is left out so a live
   * recalculation is placed against everyone else, not against a stale copy
   * of themselves.
   */
  excludePlayerName?: string,
): Promise<
  | { success: true; data: ClanPointDistribution }
  | { success: false; error: string }
> {
  try {
    const rows = await db
      .select({ points: players.points })
      .from(players)
      .where(
        excludePlayerName
          ? and(rankedMember, ne(players.playerName, excludePlayerName))
          : rankedMember,
      )
      .orderBy(desc(players.points));

    const points = rows.map(({ points: value }) => Number(value ?? 0));

    return {
      success: true,
      data: {
        points,
        memberCount: points.length + (excludePlayerName ? 1 : 0),
      },
    };
  } catch (error) {
    console.error('Error fetching clan point distribution:', error);

    return { success: false, error: 'Failed to fetch clan point distribution' };
  }
}
