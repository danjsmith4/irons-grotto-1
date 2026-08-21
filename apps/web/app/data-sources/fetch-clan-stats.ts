import { db } from '@/lib/db';
import { players, playerAcquiredItems } from '@/lib/db/schema';
import { rankedMember } from '@/lib/db/player-filters';
import { and, eq, sql } from 'drizzle-orm';
import { AllPetItemIds } from '../schemas/osrs';

export interface ClanStats {
  memberCount: number;
  totalPoints: number;
  totalClogSlots: number;
  totalPets: number;
  zukHelmCount: number;
  avgTotalLevel: number;
  bloodTorvaCount: number;
  radiantCount: number;
  infernalCount: number;
  quiverCount: number;
}

/**
 * Clan-wide aggregate stats for the "Grotto at a glance" strip. Counts ranked
 * members only (matching the leaderboard's filter) — this describes an ironman
 * clan's own progress, so a main's totals do not belong in it.
 */
export async function fetchClanStats(): Promise<
  { success: true; data: ClanStats } | { success: false; error: string }
> {
  try {
    const [row] = await db
      .select({
        memberCount: sql<number>`count(*)::int`,
        totalPoints: sql<number>`coalesce(round(sum(${players.points})), 0)::int`,
        totalClogSlots: sql<number>`coalesce(sum(${players.collectionLogCount}), 0)::int`,
        zukHelmCount: sql<number>`count(*) filter (where ${players.combatAchievementTier} = 'Grandmaster')::int`,
        avgTotalLevel: sql<number>`coalesce(round(avg(${players.totalLevel})), 0)::int`,
        bloodTorvaCount: sql<number>`count(*) filter (where ${players.hasBloodTorva})::int`,
        radiantCount: sql<number>`count(*) filter (where ${players.hasRadiantOathplate})::int`,
        infernalCount: sql<number>`count(*) filter (where ${players.tzhaarCape} = 'Infernal cape')::int`,
        quiverCount: sql<number>`count(*) filter (where ${players.hasDizanasQuiver})::int`,
      })
      .from(players)
      .where(rankedMember);

    const [petRow] = await db
      .select({ totalPets: sql<number>`count(*)::int` })
      .from(playerAcquiredItems)
      .innerJoin(
        players,
        and(
          eq(players.playerName, playerAcquiredItems.playerName),
          rankedMember,
        ),
      )
      .where(
        sql`${playerAcquiredItems.itemId} in (${sql.raw(AllPetItemIds.join(','))})`,
      );

    return {
      success: true,
      data: {
        memberCount: Number(row?.memberCount ?? 0),
        totalPoints: Number(row?.totalPoints ?? 0),
        totalClogSlots: Number(row?.totalClogSlots ?? 0),
        totalPets: Number(petRow?.totalPets ?? 0),
        zukHelmCount: Number(row?.zukHelmCount ?? 0),
        avgTotalLevel: Number(row?.avgTotalLevel ?? 0),
        bloodTorvaCount: Number(row?.bloodTorvaCount ?? 0),
        radiantCount: Number(row?.radiantCount ?? 0),
        infernalCount: Number(row?.infernalCount ?? 0),
        quiverCount: Number(row?.quiverCount ?? 0),
      },
    };
  } catch (error) {
    console.error('Failed to fetch clan stats:', error);
    return { success: false, error: String(error) };
  }
}
