import { db } from '@/lib/db';
import { players, playerRankUps } from '@/lib/db/schema';
import { asc, eq, sql } from 'drizzle-orm';

export interface RankPace {
  /** This player's rank-ups, oldest first. */
  history: { oldRank: string | null; newRank: string; createdAt: string }[];
  joinDate: string;
  /**
   * Median days clan members spent sitting at each rank before moving up,
   * keyed by the rank they were sitting at, with the number of completed
   * stints it was drawn from. Only ranks anyone has actually left appear here.
   *
   * The sample size travels with the median on purpose: most ranks have only a
   * handful of promotions behind them, and a one-off fast promotion otherwise
   * reads as "the clan clears this rank in a day".
   *
   * Nothing renders this today — see `rank-calculator/components/clan-median-pace.tsx`
   * for why, and for the component that puts it back on screen.
   */
  clanPaceByRank: Record<string, { medianDays: number; sampleSize: number }>;
}

/**
 * How long this player has held their rank, and how long the rest of the clan
 * typically takes to leave it.
 *
 * The clan figure is a median rather than a mean: a couple of members who
 * joined years ago and never applied for a promotion would drag an average
 * into uselessness.
 */
export async function fetchRankPace(
  playerName: string,
): Promise<
  { success: true; data: RankPace } | { success: false; error: string }
> {
  try {
    const [player] = await db
      .select({ joinDate: players.joinDate })
      .from(players)
      .where(eq(players.playerName, playerName))
      .limit(1);

    const history = await db
      .select({
        oldRank: playerRankUps.oldRank,
        newRank: playerRankUps.newRank,
        createdAt: playerRankUps.createdAt,
      })
      .from(playerRankUps)
      .where(eq(playerRankUps.playerName, playerName))
      .orderBy(asc(playerRankUps.createdAt));

    // Each rank-up starts a stint at `new_rank`; the player's *next* rank-up
    // ends it. lead() pairs them up per player, so a row with no next rank-up
    // (their current rank, still in progress) drops out.
    const medians = await db.execute<{
      rank: string;
      median_days: number;
      sample_size: number;
    }>(
      sql`
        select
          rank,
          percentile_cont(0.5) within group (order by days) as median_days,
          count(*)::int as sample_size
        from (
          select
            ${playerRankUps.newRank} as rank,
            extract(
              epoch from (
                lead(${playerRankUps.createdAt}) over (
                  partition by ${playerRankUps.playerName}
                  order by ${playerRankUps.createdAt}
                ) - ${playerRankUps.createdAt}
              )
            ) / 86400 as days
          from ${playerRankUps}
        ) stints
        where days is not null
        group by rank
      `,
    );

    const clanPaceByRank = Object.fromEntries(
      Array.from(medians).map((row) => [
        row.rank,
        {
          medianDays: Number(row.median_days),
          sampleSize: Number(row.sample_size),
        },
      ]),
    );

    return {
      success: true,
      data: {
        history: history.map(({ oldRank, newRank, createdAt }) => ({
          oldRank,
          newRank,
          createdAt: createdAt.toISOString(),
        })),
        joinDate: player?.joinDate ?? new Date().toISOString(),
        clanPaceByRank,
      },
    };
  } catch (error) {
    console.error('Error fetching rank pace:', error);

    return { success: false, error: 'Failed to fetch rank pace' };
  }
}
