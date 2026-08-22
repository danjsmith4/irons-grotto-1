import { auth } from '@/auth';
import { db } from '@/lib/db';
import {
  Player,
  players,
  playerAcquiredItems,
  playerAchievementDiaries,
  playerItemOverrides,
} from '@/lib/db/schema';
import { inArray, sql } from 'drizzle-orm';
import { ItemCategoryMap } from '@/app/schemas/items';
import {
  ClueScrollTier,
  CombatAchievementTier,
  DiaryLocation,
  DiaryTier,
  TzHaarCape,
} from '@/app/schemas/osrs';
import { AchievementDiaryMap } from '@/app/schemas/rank-calculator';
import { isItemAcquired } from '@/app/rank-calculator/data-sources/fetch-player-details/utils/is-item-acquired';
import {
  fetchItemDropRates,
  generateRequiredItemList,
} from '@/app/rank-calculator/data-sources/fetch-dropped-item-info';
import { buildNotableItemList } from '@/app/rank-calculator/utils/build-notable-item-list';
import { buildPointsBreakdown } from '@/app/rank-calculator/utils/build-points-breakdown';
import { stripEntityName } from '@/app/rank-calculator/utils/strip-entity-name';
import {
  buildPointsComparison,
  PointsComparison,
} from '@/app/utils/build-points-comparison';

/** Ascending, so the highest completed tier per location wins. */
const diaryTierOrder: DiaryTier[] = ['None', 'Easy', 'Medium', 'Hard', 'Elite'];

function toAchievementDiaryMap(
  rows: { location: string; tier: string; completed: boolean }[],
): AchievementDiaryMap {
  return rows.reduce<AchievementDiaryMap>((acc, row) => {
    if (!row.completed) {
      return acc;
    }

    const location = DiaryLocation.safeParse(row.location);
    const tier = DiaryTier.safeParse(row.tier);

    if (!location.success || !tier.success) {
      return acc;
    }

    const current = acc[location.data] ?? 'None';

    return diaryTierOrder.indexOf(tier.data) > diaryTierOrder.indexOf(current)
      ? { ...acc, [location.data]: tier.data }
      : acc;
  }, {});
}

/**
 * Which notable items a player holds, according to what has been *stored* for
 * them.
 *
 * The calculator's own answer additionally folds in a live WikiSync read for
 * quest- and combat-achievement-derived items, which is not something two
 * arbitrary members can be scored on from the database. Those are a handful of
 * items out of several hundred, and any shortfall shows up in the ledger's
 * `unaccounted` line rather than being quietly absorbed.
 */
function buildStoredAcquiredItems(
  notableItemList: ItemCategoryMap,
  collectionLogCounts: Record<string, number>,
  overrides: Record<string, boolean>,
): Record<string, boolean> {
  return Object.values(notableItemList)
    .flatMap(({ items }) => items)
    .reduce<Record<string, boolean>>((acc, item) => {
      const key = stripEntityName(item.name);
      const derived = isItemAcquired(item, {
        acquiredItems: collectionLogCounts,
      });

      return { ...acc, [key]: overrides[key] ?? derived };
    }, {});
}

async function loadPlayerInputs(playerNames: string[]) {
  const [items, diaries, overrides] = await Promise.all([
    db
      .select({
        playerName: playerAcquiredItems.playerName,
        itemName: playerAcquiredItems.itemName,
        count: playerAcquiredItems.count,
      })
      .from(playerAcquiredItems)
      .where(inArray(playerAcquiredItems.playerName, playerNames)),
    db
      .select({
        playerName: playerAchievementDiaries.playerName,
        location: playerAchievementDiaries.location,
        tier: playerAchievementDiaries.tier,
        completed: playerAchievementDiaries.completed,
      })
      .from(playerAchievementDiaries)
      .where(inArray(playerAchievementDiaries.playerName, playerNames)),
    db
      .select({
        playerName: playerItemOverrides.playerName,
        itemName: playerItemOverrides.itemName,
        isAcquired: playerItemOverrides.isAcquired,
      })
      .from(playerItemOverrides)
      .where(inArray(playerItemOverrides.playerName, playerNames)),
  ]);

  return (playerName: string) => ({
    collectionLogCounts: items
      .filter((row) => row.playerName === playerName)
      .reduce<Record<string, number>>(
        (acc, { itemName, count }) => ({
          ...acc,
          [stripEntityName(itemName)]: count,
        }),
        {},
      ),
    achievementDiaries: toAchievementDiaryMap(
      diaries.filter((row) => row.playerName === playerName),
    ),
    overrides: overrides
      .filter((row) => row.playerName === playerName)
      .reduce<Record<string, boolean>>(
        (acc, { itemName, isAcquired }) => ({ ...acc, [itemName]: isAcquired }),
        {},
      ),
  });
}

function breakdownFor(
  player: Player,
  stored: {
    collectionLogCounts: Record<string, number>;
    achievementDiaries: AchievementDiaryMap;
    overrides: Record<string, boolean>;
  },
  notableItemList: ItemCategoryMap,
) {
  return buildPointsBreakdown(
    {
      joinDate: player.joinDate ? new Date(player.joinDate) : null,
      ehb: player.ehb,
      ehp: player.ehp,
      totalLevel: player.totalLevel,
      combatAchievementTier: CombatAchievementTier.catch('None').parse(
        player.combatAchievementTier,
      ),
      tzhaarCape: TzHaarCape.catch('None').parse(player.tzhaarCape),
      hasBloodTorva: player.hasBloodTorva,
      hasRadiantOathplate: player.hasRadiantOathplate,
      hasDizanasQuiver: player.hasDizanasQuiver,
      hasAchievementDiaryCape: player.hasAchievementDiaryCape,
      collectionLogCount: player.collectionLogCount,
      collectionLogTotal: player.collectionLogTotal,
      clueScrollCounts: {
        Beginner: player.clueCountBeginner,
        Easy: player.clueCountEasy,
        Medium: player.clueCountMedium,
        Hard: player.clueCountHard,
        Elite: player.clueCountElite,
        Master: player.clueCountMaster,
      } satisfies Record<ClueScrollTier, number>,
      achievementDiaries: stored.achievementDiaries,
      acquiredItems: buildStoredAcquiredItems(
        notableItemList,
        stored.collectionLogCounts,
        stored.overrides,
      ),
      combatBonusPoints: player.combatBonusPoints,
      skillingBonusPoints: player.skillingBonusPoints,
      collectionLogBonusPoints: player.collectionLogBonusPoints,
      notableItemsBonusPoints: player.notableItemsBonusPoints,
    },
    notableItemList,
  );
}

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

    const dropRates = await fetchItemDropRates([...generateRequiredItemList()]);
    const notableItemList = await buildNotableItemList(dropRates);

    const storedFor = await loadPlayerInputs([
      subject.playerName,
      viewer.playerName,
    ]);

    const subjectBreakdown = breakdownFor(
      subject,
      storedFor(subject.playerName),
      notableItemList,
    );
    const viewerBreakdown = breakdownFor(
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
