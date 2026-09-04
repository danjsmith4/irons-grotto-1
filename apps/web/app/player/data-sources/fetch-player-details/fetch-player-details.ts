import 'core-js/actual/set/intersection';
import 'core-js/actual/set/is-subset-of';
import { itemList } from '@/data/item-list';
import { stripEntityName } from '@/app/player/utils/strip-entity-name';
import { ApiResponse } from '@/types/api';
import * as Sentry from '@sentry/nextjs';
import { Rank } from '@/config/enums';
import { clientConstants } from '@/config/constants.client';
import { redirect } from 'next/navigation';
import {
  CollectionLogAcquiredItemMap,
  isHolidayTrack,
} from '@/app/schemas/wiki';
import { TzHaarCape } from '@/app/schemas/osrs';
import { isItemAcquired } from './utils/is-item-acquired';
import { getWikiSyncData } from './get-wikisync-data';
import { fetchTemplePlayerStats } from '../fetch-temple-player-stats';
import { calculateCombatAchievementTier } from './utils/calculate-combat-achievement-tier';
import { parseAchievementDiaries } from './utils/parse-achievement-diaries';
import { mergeCombatAchievementTier } from './utils/merge-combat-achievement-tier';
import { mergeAchievementDiaries } from './utils/merge-achievement-diaries';
import { calculateEfficiencyData } from './utils/calculate-efficiency-data';
import { RankCalculatorSchema } from '../../[player]/submit-rank-calculator-validation';
import { validatePlayerExists } from '../../validation/player-validation';
import { fetchTemplePlayerCollectionLog } from './fetch-temple-collection-log';
import { fetchTempleConstants } from './fetch-temple-constants';
import { mergeTzhaarCapes } from './utils/merge-tzhaar-capes';
import { isAchievementDiaryCapeAchieved } from '../../utils/is-achievement-diary-cape-achieved';
import {
  DiscordRolesResult,
  fetchUserDiscordRoles,
} from '../fetch-user-discord-roles';
import { calculateCombatDiaryTierBonusPoints } from '../../utils/calculators/calculate-custom-diary-tier-multipliers';
import {
  processPlayerData,
  getPlayerByName,
  updatePlayerAccountType,
} from '@/lib/db/player-operations';
import {
  getItemOverrides,
  syncItemOverrides,
} from '@/lib/db/item-override-operations';
import {
  getDerivedItems,
  syncDerivedItems,
} from '@/lib/db/derived-item-operations';
import { getStoredCollectionLogCounts } from '@/lib/db/stored-collection-log';
import { getSourceDerivedItemNames } from '@/app/player/utils/get-source-derived-item-names';
import { resolveDerivedItemWrite } from './utils/resolve-derived-item-write';
import { buildPreviouslyAcquiredItems } from './utils/build-previously-acquired-items';
import {
  resolveTempleAccountType,
  TempleOSRSCollectionLogItem,
} from '@/app/schemas/temple-api';

export interface PlayerDetailsResponse extends Omit<
  RankCalculatorSchema,
  'rank' | 'points'
> {
  currentRank?: Rank;
  hasTemplePlayerStats: boolean;
  hasTempleCollectionLog: boolean;
  hasWikiSyncData: boolean;
  hasThirdPartyData: boolean;
  isTempleCollectionLogOutdated: boolean;
  isMobileOnly: boolean;
  rawCollectionLogItems?: TempleOSRSCollectionLogItem[];
  /**
   * Whether we were able to read this player's discord roles. `unavailable`
   * means the role-derived bonus points below are carried over from the stored
   * record rather than freshly calculated.
   */
  discordMembership?: DiscordRolesResult['status'];
  /**
   * What the data sources say **on their own**, before any stored claim is
   * merged in.
   *
   * The values above are blended — a player's claim wins where it outruns what
   * a source can currently see — and that is right for display and for points.
   * But the submission diff exists precisely to show a moderator where a claim
   * outruns its evidence, and comparing a blend against itself can only ever
   * report agreement.
   */
  sourceValues?: {
    achievementDiaries: RankCalculatorSchema['achievementDiaries'] | null;
    acquiredItems: string[];
    combatAchievementTier: RankCalculatorSchema['combatAchievementTier'] | null;
    collectionLogCount: number;
    totalLevel: number;
    tzhaarCape: RankCalculatorSchema['tzhaarCape'];
    hasBloodTorva: boolean;
    hasDizanasQuiver: boolean;
    hasAchievementDiaryCape: boolean;
  };
}

export const emptyResponse = {
  achievementDiaries: {
    'Kourend & Kebos': 'None',
    'Lumbridge & Draynor': 'None',
    'Western Provinces': 'None',
    Ardougne: 'None',
    Desert: 'None',
    Falador: 'None',
    Fremennik: 'None',
    Kandarin: 'None',
    Karamja: 'None',
    Morytania: 'None',
    Varrock: 'None',
    Wilderness: 'None',
  },
  acquiredItems: {},
  joinDate: new Date(),
  collectionLogCount: 0,
  collectionLogTotal: 0,
  combatAchievementTier: 'None',
  ehb: 0,
  ehp: 0,
  totalLevel: 0,
  totalXp: 0,
  playerName: '',
  accountType: null,
  staffRole: null,
  proofLink: undefined,
  hasTemplePlayerStats: false,
  hasTempleCollectionLog: false,
  hasWikiSyncData: false,
  hasThirdPartyData: false,
  isTempleCollectionLogOutdated: false,
  isMobileOnly: false,
  tzhaarCape: 'None',
  hasBloodTorva: false,
  hasRadiantOathplate: false,
  hasDizanasQuiver: false,
  hasAchievementDiaryCape: false,
  combatBonusPoints: 0,
  skillingBonusPoints: 0,
  collectionLogBonusPoints: 0,
  notableItemsBonusPoints: 0,
  clueScrollCounts: {
    Beginner: 0,
    Easy: 0,
    Medium: 0,
    Hard: 0,
    Elite: 0,
    Master: 0,
  },
} satisfies PlayerDetailsResponse;

export async function fetchPlayerDetails(
  player: string,
  userId: string,
): Promise<ApiResponse<PlayerDetailsResponse>> {
  const playerRecord = await getPlayerByName(player, userId);

  if (!playerRecord) {
    return {
      success: false,
      error: `Player '${player}' not found in database`,
    };
  }

  Sentry.setTag('has-player-record', true);

  const isPlayerNameValid = await validatePlayerExists(player);

  if (!isPlayerNameValid) {
    // For now, redirect to edit page - in the future we might delete the record or handle differently
    redirect(`/player/${player}/edit`);
  }

  // Update Temple to get the most up-to-date info
  // Ignore any errors as this isn't required to succeed
  try {
    await fetch(
      `${clientConstants.temple.baseUrl}/php/add_datapoint.php?player=${player}`,
    );
  } catch (error) {
    Sentry.captureException(error);
  }

  try {
    // The Redis draft is gone, and with it the `mergeSavedData` parameter that
    // chose between it and the record. The player's own answers now live in
    // their record (scalars, diaries) and in `player_item_overrides` (notable
    // items), written by autosave — `currentDbValues` below and the stored
    // overrides read further down are what `savedData` used to be.
    //
    // The `savedData?.` reads that remain are dead branches kept only to avoid
    // rewriting fifteen merge expressions in a change that is already large;
    // each one now falls through to the record.
    const savedData = undefined as RankCalculatorSchema | undefined;

    // The stored record is the floor for anything a source might fail to
    // report. An unreachable source says *nothing*, which is not the same as
    // saying "no" — but the values below are all computed as plain booleans and
    // counts, so a missing source arrives here indistinguishable from a genuine
    // negative and would be written straight over a real value.
    //
    // This used to cover `hasRadiantOathplate` alone (the one field somebody
    // noticed, because it has no source at all) and only when `mergeSavedData`
    // was false. Every field here has the same failure mode, and it applies in
    // both modes: a player with no draft yet gets no protection from `savedData`
    // either. Hence unconditional, and covering all of them.
    const currentDbValues = {
      hasRadiantOathplate: playerRecord.hasRadiantOathplate,
      hasBloodTorva: playerRecord.hasBloodTorva,
      hasDizanasQuiver: playerRecord.hasDizanasQuiver,
      hasAchievementDiaryCape: playerRecord.hasAchievementDiaryCape,
      clueScrollCounts: {
        Beginner: playerRecord.clueCountBeginner,
        Easy: playerRecord.clueCountEasy,
        Medium: playerRecord.clueCountMedium,
        Hard: playerRecord.clueCountHard,
        Elite: playerRecord.clueCountElite,
        Master: playerRecord.clueCountMaster,
      },
    };

    const { joinDate, playerName: rsn, rank: currentRank } = playerRecord;
    const [wikiSyncData, templePlayerStats, templeCollectionLog, discordRoles] =
      await Promise.all([
        getWikiSyncData(player),
        fetchTemplePlayerStats(player),
        fetchTemplePlayerCollectionLog(player),
        fetchUserDiscordRoles(userId),
      ]);

    // Collection log items will be handled downstream in create/update functions

    const hasThirdPartyData = Boolean(
      wikiSyncData ?? templePlayerStats ?? templeCollectionLog,
    );

    Sentry.setTags({
      'has-wikisync-data': !!wikiSyncData,
      'has-temple-data': !!templePlayerStats,
      'has-temple-collection-log-data': !!templeCollectionLog,
      'has-saved-data': !!savedData,
      'has-third-party-data': hasThirdPartyData,
    });

    if (!hasThirdPartyData && !savedData) {
      return { error: null, success: true, data: emptyResponse };
    }

    const collectionLogTotal =
      templeCollectionLog?.total_collections_available ??
      (await fetchTempleConstants())?.MAX_COLLECTION_LOGS;

    if (!collectionLogTotal) {
      throw new Error('Unable to determine max collection log slots');
    }

    const combatAchievementTier = wikiSyncData
      ? await calculateCombatAchievementTier(wikiSyncData.combat_achievements)
      : null;

    const {
      Overall_level: totalLevel = null,
      Overall: totalXp = null,
      Collections: hiscoresCollectionLogCount = null,
      'TzKal-Zuk': zukKillCount = null,
      Clue_beginner: beginnerClueCount = null,
      Clue_easy: easyClueCount = null,
      Clue_medium: mediumClueCount = null,
      Clue_hard: hardClueCount = null,
      Clue_elite: eliteClueCount = null,
      Clue_master: masterClueCount = null,
    } = templePlayerStats ?? {};
    const { ehb, ehp } = calculateEfficiencyData(templePlayerStats);

    const { total_collections_finished: templeCollectionLogCount = null } =
      templeCollectionLog ?? {};

    const isTempleCollectionLogOutdated =
      templeCollectionLogCount && hiscoresCollectionLogCount
        ? templeCollectionLogCount < hiscoresCollectionLogCount
        : false;

    const {
      achievementDiaries = null,
      quests = null,
      musicTracks = null,
      combatAchievements = null,
    } = wikiSyncData
      ? {
          achievementDiaries: parseAchievementDiaries(
            wikiSyncData.achievement_diaries,
          ),
          quests: wikiSyncData.quests,
          musicTracks: wikiSyncData.music_tracks,
          combatAchievements: wikiSyncData.combat_achievements,
        }
      : {};

    const collectionLogItems =
      templeCollectionLog?.items.reduce(
        (acc, { name, count }) => ({ ...acc, [stripEntityName(name)]: count }),
        CollectionLogAcquiredItemMap.parse({}),
      ) ?? null;

    const acquiredItems =
      wikiSyncData || templeCollectionLog
        ? Object.values(itemList)
            .flatMap(({ items }) => items)
            .filter((item) =>
              isItemAcquired(item, {
                acquiredItems: collectionLogItems,
                quests,
                combatAchievements,
              }),
            )
            .map(({ name }) => stripEntityName(name))
        : [];

    // What the player has said for themselves, from both places it can live.
    //
    // The draft still wins where it has an opinion, so nothing changes for a
    // player mid-edit. The stored overrides are what make that draft removable:
    // they are the only durable home for a tick no data source accounts for,
    // and they are written back further down.
    const storedOverrides = await getItemOverrides(playerRecord.playerName);

    /**
     * The floor under the six notable items nothing logs.
     *
     * They are settled purely by WikiSync, so when WikiSync is unreachable
     * `isItemAcquired` returns false for every one of them — and, unlike a
     * collection log item, there is no second source and no logged copy to
     * recover them from. Before `player_derived_items` existed that silently
     * subtracted up to 480 points from the stored total and left no trace,
     * which is the same hazard `currentDbValues` guards for the scalars: an
     * unreachable source says *nothing*, not no.
     *
     * Applied only when WikiSync did not answer. When it did, its answer is
     * authoritative and is written back below — otherwise a stale `true` would
     * outlive the thing it described.
     */
    const storedDerivedItems = wikiSyncData
      ? {}
      : await getDerivedItems(playerRecord.playerName);

    /**
     * The floor under the collection log itself.
     *
     * `player_acquired_items` holds every logged item any sync has ever seen,
     * and a collection log slot cannot be un-earned — so anything in it is
     * still owned, whatever this particular Temple response happens to say.
     * Without this the live read was treated as the whole truth, and it is
     * routinely not: Temple's item names drift, responses come back partial,
     * and the endpoint can be down. Measured on a live member, Temple returned
     * 543 items while 17 notable items they own — a Tombs of Amascut set,
     * three pets, Soulreaper axe — existed only in the stored rows, leaving
     * their sheet 654 points below their own record and below the leaderboard.
     *
     * Unlike `storedDerivedItems` this is applied **whether or not the source
     * answered**, because a collection log answer is only ever additive: an
     * item missing from the response means the response did not mention it,
     * never that it was given back.
     */
    const storedCollectionLogCounts = await getStoredCollectionLogCounts(
      playerRecord.playerName,
    );

    const storedCollectionLogItems = Object.values(itemList)
      .flatMap(({ items }) => items)
      .filter((item) =>
        isItemAcquired(item, { acquiredItems: storedCollectionLogCounts }),
      )
      .reduce<Record<string, boolean>>(
        (acc, { name }) => ({ ...acc, [stripEntityName(name)]: true }),
        {},
      );

    const previouslyAcquiredItems = buildPreviouslyAcquiredItems({
      savedAcquiredItems: savedData?.acquiredItems,
      storedOverrides,
      storedDerivedItems,
      storedCollectionLogItems,
    });

    const allCurrentNotableItemNames = new Set(
      Object.values(itemList)
        .flatMap(({ items }) => items)
        .map(({ name }) => stripEntityName(name)),
    );

    const hasMusicCape = musicTracks
      ? Object.entries(musicTracks)
          .filter(([track]) => !isHolidayTrack(track))
          .every(([, unlocked]) => unlocked)
      : false;

    const acquiredItemsMap = [
      ...new Set(acquiredItems.concat(previouslyAcquiredItems)).intersection(
        allCurrentNotableItemNames,
      ),
    ].reduce<Record<string, boolean>>(
      (acc, val) => ({ ...acc, [stripEntityName(val)]: true }),
      { ...(hasMusicCape && { 'Music cape': true }) },
    );

    const proofLink =
      savedData?.proofLink ??
      (templeCollectionLog
        ? `${clientConstants.temple.baseUrl}/player/collection-log.php?player=${player}`
        : undefined);

    const hasInfernalCape = zukKillCount ? zukKillCount > 0 : false;
    const hasFireCape =
      wikiSyncData?.combat_achievements.includes(
        147, // https://oldschool.runescape.wiki/w/Fight_Caves_Veteran
      ) ?? false;

    const tzhaarCape =
      (hasInfernalCape && TzHaarCape.enum['Infernal cape']) ||
      (hasFireCape && TzHaarCape.enum['Fire cape']) ||
      TzHaarCape.enum.None;

    const hasBloodTorva = new Set([
      490, // https://oldschool.runescape.wiki/w/Vardorvis_Sleeper
      499, // https://oldschool.runescape.wiki/w/Whispered
      508, // https://oldschool.runescape.wiki/w/Leviathan_Sleeper
      517, // https://oldschool.runescape.wiki/w/Duke_Sucellus_Sleeper
    ]).isSubsetOf(new Set(wikiSyncData?.combat_achievements));

    const hasDizanasQuiver =
      wikiSyncData?.combat_achievements.includes(
        538, // https://oldschool.runescape.wiki/w/Sportsmanship
      ) ?? false;

    const hasAchievementDiaryCape = achievementDiaries
      ? isAchievementDiaryCapeAchieved(achievementDiaries)
      : false;

    // A failed discord lookup is not evidence that the player holds no diary
    // roles, so fall back to the stored values instead of zeroing them out.
    const { combatBonusPoints, collectionLogBonusPoints } =
      calculateCombatDiaryTierBonusPoints(discordRoles) ?? {
        combatBonusPoints: playerRecord.combatBonusPoints,
        collectionLogBonusPoints: playerRecord.collectionLogBonusPoints,
      };

    // Game mode. Temple settles it whenever it reports anything but a main;
    // a main reading is ambiguous (it reports group ironmen it has never heard
    // of the same way), so we fall back to whatever the player has already
    // told us and leave it null when nobody has. Null is what makes the
    // calculator ask.
    const templeAccountType = templePlayerStats
      ? resolveTempleAccountType(
          templePlayerStats.info['Game mode'],
          templePlayerStats.info.GIM,
        )
      : null;
    const accountType = templeAccountType ?? playerRecord.accountType;

    if (templeAccountType && templeAccountType !== playerRecord.accountType) {
      await updatePlayerAccountType(rsn, templeAccountType).catch((error) => {
        Sentry.captureException(error);
      });
    }

    const result = {
      success: true as const,
      error: null,
      data: {
        achievementDiaries:
          mergeAchievementDiaries(
            achievementDiaries,
            savedData?.achievementDiaries ?? null,
          ) ?? emptyResponse.achievementDiaries,
        acquiredItems: acquiredItemsMap,
        combatAchievementTier:
          mergeCombatAchievementTier(
            combatAchievementTier,
            savedData?.combatAchievementTier ?? null,
          ) ?? 'None',
        collectionLogCount: Math.max(
          templeCollectionLogCount ?? 0,
          hiscoresCollectionLogCount ?? 0,
          savedData?.collectionLogCount ?? 0,
        ),
        ehb: Math.round(ehb ?? savedData?.ehb ?? 0),
        ehp: Math.round(ehp ?? savedData?.ehp ?? 0),
        totalLevel: Math.max(totalLevel ?? 0, savedData?.totalLevel ?? 0),
        totalXp: Math.max(totalXp ?? 0, savedData?.totalXp ?? 0),
        collectionLogTotal,
        joinDate: new Date(joinDate),
        playerName: rsn,
        accountType,
        staffRole: playerRecord.staffRole,
        proofLink,
        currentRank: currentRank as Rank,
        tzhaarCape: mergeTzhaarCapes(tzhaarCape, savedData?.tzhaarCape),
        // Each of these latches on: once earned it cannot be lost in game, so
        // the only thing a `false` from any one input can mean is "this input
        // could not see it". Falling through to the stored value last is what
        // stops a WikiSync outage silently unsetting a member's kit.
        hasBloodTorva:
          hasBloodTorva ||
          (savedData?.hasBloodTorva ?? false) ||
          currentDbValues.hasBloodTorva,
        hasRadiantOathplate:
          savedData?.hasRadiantOathplate ?? currentDbValues.hasRadiantOathplate,
        hasDizanasQuiver:
          hasDizanasQuiver ||
          (savedData?.hasDizanasQuiver ?? false) ||
          currentDbValues.hasDizanasQuiver,
        hasAchievementDiaryCape:
          hasAchievementDiaryCape ||
          (savedData?.hasAchievementDiaryCape ?? false) ||
          currentDbValues.hasAchievementDiaryCape,
        hasTemplePlayerStats: !!templePlayerStats,
        hasTempleCollectionLog: !!templeCollectionLog,
        hasWikiSyncData: !!wikiSyncData,
        hasThirdPartyData,
        isTempleCollectionLogOutdated,
        isMobileOnly: playerRecord.isMobileOnly ?? false,
        discordMembership: discordRoles.status,
        collectionLogBonusPoints: collectionLogBonusPoints,
        combatBonusPoints,
        skillingBonusPoints: 0, // Leaving this in for future use, if we decide to add a skilling diary
        notableItemsBonusPoints: 0, // Leaving this in for future use, if we decide to add a notable items diary
        // Clue counts only go up in game, so a reading lower than what is
        // stored means Temple is incomplete rather than that the player lost
        // clues. Without the floor, a Temple outage maps every count to 0 and
        // writes it, wiping the lot.
        clueScrollCounts: {
          Beginner: Math.max(
            beginnerClueCount ?? 0,
            currentDbValues.clueScrollCounts.Beginner,
          ),
          Easy: Math.max(
            easyClueCount ?? 0,
            currentDbValues.clueScrollCounts.Easy,
          ),
          Medium: Math.max(
            mediumClueCount ?? 0,
            currentDbValues.clueScrollCounts.Medium,
          ),
          Hard: Math.max(
            hardClueCount ?? 0,
            currentDbValues.clueScrollCounts.Hard,
          ),
          Elite: Math.max(
            eliteClueCount ?? 0,
            currentDbValues.clueScrollCounts.Elite,
          ),
          Master: Math.max(
            masterClueCount ?? 0,
            currentDbValues.clueScrollCounts.Master,
          ),
        },
        rawCollectionLogItems: templeCollectionLog
          ? templeCollectionLog.items
          : [],
        // Unblended, for the submission diff. Every one of these is the raw
        // local computed above, before the merge expressions folded the
        // player's own claim into it.
        sourceValues: {
          achievementDiaries,
          acquiredItems,
          combatAchievementTier,
          collectionLogCount: Math.max(
            templeCollectionLogCount ?? 0,
            hiscoresCollectionLogCount ?? 0,
          ),
          totalLevel: totalLevel ?? 0,
          tzhaarCape,
          hasBloodTorva,
          hasDizanasQuiver,
          hasAchievementDiaryCape,
        },
      },
    };

    // Sync to shadow dataset if we have third-party data
    if (hasThirdPartyData) {
      try {
        await processPlayerData(result.data, userId);
      } catch (error) {
        console.error('Failed to sync player data to database:', error);
        // Continue even if database sync fails
      }

      // Persist the ticks the sources don't account for. This has to happen
      // here rather than inside `processPlayerData`, because this is the only
      // place that still knows which items were *derived* — by the time the
      // response is assembled the two sets have been unioned and the
      // distinction is gone.
      //
      // After `processPlayerData`, so a brand new player has a row to hang
      // these off. Non-fatal for the same reason as the sync above.
      try {
        await syncItemOverrides(playerRecord.playerName, {
          derived: acquiredItems,
          submitted: acquiredItemsMap,
        });
      } catch (error) {
        console.error('Failed to sync notable item overrides:', error);
      }

      // Give the unlogged items their home.
      //
      // `acquiredItems` rather than `acquiredItemsMap` — this records what the
      // *source* said, not what the merge concluded, or a player's own tick
      // would come back next sync wearing a source's authority. Music cape is
      // settled by WikiSync's music tracks rather than by `isItemAcquired`, so
      // it is added here the same way it is added to the map above.
      //
      // Whether to write at all is `resolveDerivedItemWrite`'s decision, not a
      // condition here — see its note.
      try {
        const answers = resolveDerivedItemWrite({
          itemNames: getSourceDerivedItemNames(itemList),
          sourceAnswered: !!wikiSyncData,
          sourceItems: hasMusicCape
            ? [...acquiredItems, 'Music cape']
            : acquiredItems,
        });

        if (answers) {
          await syncDerivedItems(playerRecord.playerName, answers);
        }
      } catch (error) {
        console.error('Failed to sync source-derived items:', error);
      }
    }

    return result;
  } catch (error) {
    Sentry.captureException(error);

    return { error: 'Something went wrong', success: false };
  }
}
