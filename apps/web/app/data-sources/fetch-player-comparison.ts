import { auth } from '@/auth';
import { db } from '@/lib/db';
import { players } from '@/lib/db/schema';
import { sql } from 'drizzle-orm';
import {
  buildScoringItemList,
  loadStoredPlayerInputs,
  scorePlayerFromRecord,
} from './score-players-from-record';
import {
  buildPointsComparison,
  PointsComparison,
} from '@/app/utils/build-points-comparison';

/**
 * Why one member's total is what it is, measured against one of the viewer's
 * own accounts.
 *
 * Both sides are scored from the database with the *same* code the leaderboard
 * uses, so the comparison is of two players rather than of two point systems.
 * Nothing here writes: `players.points` is still only ever set by
 * `processPlayerData`.
 *
 * The viewer's side is verified to be theirs. Everything reported is already
 * public on the two profiles, so this is not hiding anything — it stops the
 * endpoint from being a general-purpose "score any two members" API that the
 * profile never asked for.
 */
export async function fetchPlayerComparison(
  subjectName: string,
  viewerName: string,
): Promise<
  { success: true; data: PointsComparison } | { success: false; error: string }
> {
  try {
    const session = await auth();
    const discordUserId = session?.user?.id;

    if (!discordUserId) {
      return { success: false, error: 'Sign in to compare accounts' };
    }

    const [subject, viewer] = await Promise.all(
      [subjectName, viewerName].map(async (name) => {
        const [record] = await db
          .select()
          .from(players)
          .where(sql`lower(${players.playerName}) = lower(${name})`)
          .limit(1);

        return record;
      }),
    );

    if (!subject) {
      return { success: false, error: `Player '${subjectName}' not found` };
    }

    if (!viewer) {
      return { success: false, error: `Player '${viewerName}' not found` };
    }

    if (viewer.discordUserId !== discordUserId) {
      return { success: false, error: 'That account is not yours to compare' };
    }

    if (subject.playerName === viewer.playerName) {
      return { success: false, error: 'Pick a different account to compare' };
    }

    const [notableItemList, storedFor] = await Promise.all([
      buildScoringItemList(),
      loadStoredPlayerInputs([subject.playerName, viewer.playerName]),
    ]);

    const subjectBreakdown = scorePlayerFromRecord(
      subject,
      storedFor(subject.playerName),
      notableItemList,
    );
    const viewerBreakdown = scorePlayerFromRecord(
      viewer,
      storedFor(viewer.playerName),
      notableItemList,
    );

    return {
      success: true,
      data: buildPointsComparison(
        {
          playerName: subject.playerName,
          rank: subject.rank,
          storedPoints: Math.round(subject.points),
          breakdownPoints: subjectBreakdown.totalPoints,
          breakdown: subjectBreakdown,
        },
        {
          playerName: viewer.playerName,
          rank: viewer.rank,
          storedPoints: Math.round(viewer.points),
          breakdownPoints: viewerBreakdown.totalPoints,
          breakdown: viewerBreakdown,
        },
      ),
    };
  } catch (error) {
    console.error('Failed to build player comparison:', error);

    return { success: false, error: String(error) };
  }
}

export type { PointsComparison };
