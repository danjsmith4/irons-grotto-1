import { db } from '@/lib/db';
import { playerAcquiredItems, players } from '@/lib/db/schema';
import { desc, sql } from 'drizzle-orm';
import { AllPetItemIds } from '../schemas/osrs';

export interface LeaderboardPlayer {
  playerName: string;
  rank: string | null;
  points: number;
  hasRadiant: boolean;
  hasBlorva: boolean;
  hasInfernal: boolean;
  hasQuiver: boolean;
  hasFangKit: boolean;
  clogSlots: number;
  ehb: number;
  ehp: number;
  totalXp: number;
  totalPets: number;
  isMaxed: boolean;
  caTier: string;
}

export async function fetchLeaderboard(
  limit = 50,
  offset = 0,
): Promise<
  | { success: true; data: LeaderboardPlayer[] }
  | { success: false; error: string }
> {
  try {
    const rawData = await db
      .select({
        playerName: players.playerName,
        rank: players.rank,
        points: players.points,
        hasRadiant: players.hasRadiantOathplate,
        hasBlorva: players.hasBloodTorva,
        tzhaarCape: players.tzhaarCape,
        hasQuiver: players.hasDizanasQuiver,
        hasFangKit: sql<boolean>`CASE WHEN ${playerAcquiredItems.playerName} IS NOT NULL THEN true ELSE false END`,
        clogSlots: players.collectionLogCount,
        ehb: players.ehb,
        ehp: players.ehp,
        totalLevel: players.totalLevel,
        totalXp: players.totalXp,
        caTier: players.combatAchievementTier,
        totalPets: sql<number>`(
          SELECT COUNT(*)
          FROM player_acquired_items pai
          WHERE pai.player_name = players.player_name
          AND pai.item_id IN (${sql.raw(AllPetItemIds.join(','))})
        )`,
      })
      .from(players)
      .leftJoin(
        playerAcquiredItems,
        sql`${players.playerName} = ${playerAcquiredItems.playerName} AND ${playerAcquiredItems.itemName} = 'Cursed phalanx'`,
      )
      .orderBy(desc(players.points))
      .limit(limit)
      .offset(offset);

    const leaderboardData = rawData.map((player) => ({
      playerName: player.playerName,
      rank: player.rank,
      points: player.points,
      hasRadiant: player.hasRadiant,
      hasBlorva: player.hasBlorva,
      hasInfernal: player.tzhaarCape == 'Infernal cape',
      hasQuiver: player.hasQuiver,
      hasFangKit: player.hasFangKit,
      clogSlots: player.clogSlots,
      ehb: player.ehb,
      ehp: player.ehp,
      totalXp: player.totalXp,
      totalPets: player.totalPets ?? 0,
      isMaxed: player.totalLevel === 2376,
      caTier: player.caTier,
    }));

    return { success: true, data: leaderboardData };
  } catch (error) {
    console.error('Failed to fetch leaderboard:', error);
    return { success: false, error: String(error) };
  }
}
