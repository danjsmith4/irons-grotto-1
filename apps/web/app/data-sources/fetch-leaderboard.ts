import { db } from '@/lib/db';
import { players } from '@/lib/db/schema';
import { desc } from 'drizzle-orm';

export interface LeaderboardPlayer {
  playerName: string;
  rank: string | null;
  points: number;
  hasRadiant: boolean;
  hasBlorva: boolean;
  hasInfernal: boolean;
  hasQuiver: boolean;
  clogSlots: number;
  ehb: number;
  ehp: number;
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
        clogSlots: players.collectionLogCount,
        ehb: players.ehb,
        ehp: players.ehp,
        totalLevel: players.totalLevel,
        caTier: players.combatAchievementTier,
      })
      .from(players)
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
      clogSlots: player.clogSlots,
      ehb: player.ehb,
      ehp: player.ehp,
      isMaxed: player.totalLevel === 2376,
      caTier: player.caTier,
    }));

    return { success: true, data: leaderboardData };
  } catch (error) {
    console.error('Failed to fetch leaderboard:', error);
    return { success: false, error: String(error) };
  }
}
