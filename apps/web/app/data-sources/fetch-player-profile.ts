import { db } from '@/lib/db';
import {
  players,
  playerAcquiredItems,
  playerAchievementDiaries,
  playerRankUps,
} from '@/lib/db/schema';
import { and, desc, eq, sql } from 'drizzle-orm';
import { AllPetItemIds } from '../schemas/osrs';
import { rankThresholds } from '@/config/ranks';

export interface PlayerProfile {
  playerName: string;
  rank: string;
  points: number;
  joinDate: string;
  ehb: number;
  ehp: number;
  totalLevel: number;
  totalXp: number;
  isMaxed: boolean;
  combatAchievementTier: string;
  collectionLogCount: number;
  collectionLogTotal: number;
  totalPets: number;
  isMobileOnly: boolean;
  proofLink: string | null;

  clues: {
    beginner: number;
    easy: number;
    medium: number;
    hard: number;
    elite: number;
    master: number;
  };

  notables: {
    bloodTorva: boolean;
    radiantOathplate: boolean;
    dizanasQuiver: boolean;
    achievementDiaryCape: boolean;
    infernalCape: boolean;
    maxCape: boolean;
  };

  // Points-based rank progress (Standard structure).
  currentRankThreshold: number;
  nextRank: string | null;
  nextRankThreshold: number | null;

  diaries: { location: string; tier: string; completed: boolean }[];
  rankUps: { oldRank: string | null; newRank: string; createdAt: string }[];

  // The player's rarest items (fewest active owners clan-wide), top 3.
  hallOfFame: { itemName: string; itemId: number; owners: number }[];
}

function computeRankProgress(points: number) {
  const entries = Object.entries(rankThresholds.Standard)
    .map(([rank, threshold]) => ({ rank, threshold: threshold ?? 0 }))
    .sort((a, b) => a.threshold - b.threshold);

  let currentRankThreshold = 0;
  let nextRank: string | null = null;
  let nextRankThreshold: number | null = null;

  for (let i = 0; i < entries.length; i += 1) {
    if (points >= entries[i].threshold) {
      currentRankThreshold = entries[i].threshold;
      const next = entries[i + 1];
      nextRank = next?.rank ?? null;
      nextRankThreshold = next?.threshold ?? null;
    }
  }

  return { currentRankThreshold, nextRank, nextRankThreshold };
}

export async function fetchPlayerProfile(
  name: string,
): Promise<
  | { success: true; data: PlayerProfile }
  | { success: false; error: string }
> {
  try {
    const [player] = await db
      .select()
      .from(players)
      .where(sql`lower(${players.playerName}) = lower(${name})`)
      .limit(1);

    if (!player) {
      return { success: false, error: 'Player not found' };
    }

    const [petRow] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(playerAcquiredItems)
      .where(
        and(
          eq(playerAcquiredItems.playerName, player.playerName),
          sql`${playerAcquiredItems.itemId} in (${sql.raw(AllPetItemIds.join(','))})`,
        ),
      );

    const diaries = await db
      .select({
        location: playerAchievementDiaries.location,
        tier: playerAchievementDiaries.tier,
        completed: playerAchievementDiaries.completed,
      })
      .from(playerAchievementDiaries)
      .where(eq(playerAchievementDiaries.playerName, player.playerName));

    const rankUps = await db
      .select({
        oldRank: playerRankUps.oldRank,
        newRank: playerRankUps.newRank,
        createdAt: playerRankUps.createdAt,
      })
      .from(playerRankUps)
      .where(eq(playerRankUps.playerName, player.playerName))
      .orderBy(desc(playerRankUps.createdAt))
      .limit(20);

    // Hall of Fame: the player's items ranked by how few active members own
    // them clan-wide (rarest first).
    const hallOfFame = (await db.execute(sql`
      SELECT pai.item_name AS "itemName", pai.item_id AS "itemId", oc.owners
      FROM player_acquired_items pai
      JOIN (
        SELECT p.item_id, COUNT(DISTINCT p.player_name)::int AS owners
        FROM player_acquired_items p
        JOIN players pl ON pl.player_name = p.player_name AND pl.is_active = true
        GROUP BY p.item_id
      ) oc ON oc.item_id = pai.item_id
      WHERE pai.player_name = ${player.playerName}
      ORDER BY oc.owners ASC, pai.item_name ASC
      LIMIT 3
    `)) as unknown as {
      itemName: string;
      itemId: number;
      owners: number;
    }[];

    const progress = computeRankProgress(player.points);

    return {
      success: true,
      data: {
        playerName: player.playerName,
        rank: player.rank,
        points: Math.round(player.points),
        joinDate: player.joinDate,
        ehb: player.ehb,
        ehp: player.ehp,
        totalLevel: player.totalLevel,
        totalXp: player.totalXp,
        isMaxed: player.totalLevel === 2376,
        combatAchievementTier: player.combatAchievementTier,
        collectionLogCount: player.collectionLogCount,
        collectionLogTotal: player.collectionLogTotal,
        totalPets: Number(petRow?.count ?? 0),
        isMobileOnly: player.isMobileOnly,
        proofLink: player.proofLink,
        clues: {
          beginner: player.clueCountBeginner,
          easy: player.clueCountEasy,
          medium: player.clueCountMedium,
          hard: player.clueCountHard,
          elite: player.clueCountElite,
          master: player.clueCountMaster,
        },
        notables: {
          bloodTorva: player.hasBloodTorva,
          radiantOathplate: player.hasRadiantOathplate,
          dizanasQuiver: player.hasDizanasQuiver,
          achievementDiaryCape: player.hasAchievementDiaryCape,
          infernalCape: player.tzhaarCape === 'Infernal cape',
          maxCape: player.totalLevel === 2376,
        },
        ...progress,
        diaries,
        rankUps: rankUps.map((r) => ({
          oldRank: r.oldRank,
          newRank: r.newRank,
          createdAt: r.createdAt.toISOString(),
        })),
        hallOfFame: hallOfFame.map((h) => ({
          itemName: h.itemName,
          itemId: Number(h.itemId),
          owners: Number(h.owners),
        })),
      },
    };
  } catch (error) {
    console.error('Failed to fetch player profile:', error);
    return { success: false, error: String(error) };
  }
}
