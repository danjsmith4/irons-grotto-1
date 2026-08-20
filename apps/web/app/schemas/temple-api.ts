import { z } from 'zod';
import { AccountType, isMainAccount } from './staff';

const MemberInfo = z.object({
  player: z.string(),
  game_mode: z.number().int(),
  on_hiscores: z.union([z.literal(1), z.literal(0)]),
  last_checked: z.string(),
  last_changed_xp: z.string(),
  last_changed_xp_unix_time: z.number().int(),
});

type MemberInfo = z.infer<typeof MemberInfo>;

interface PlayerInfo {
  'Game mode': number;
  GIM: number;
  'Datapoint Cooldown': '-' | number;
}

export interface PlayerInfoResponse {
  data: PlayerInfo;
}

/**
 * `player_info.php` — the cheap half of `player_stats.php`, carrying the game
 * mode without the skills, bosses and collection log we do not want when all
 * we are doing is resolving an account type.
 */
export const TempleOSRSPlayerInfo = z.object({
  data: z.object({
    'Game mode': z.number(),
    GIM: z.number(),
  }),
});

export type TempleOSRSPlayerInfo = z.infer<typeof TempleOSRSPlayerInfo>;

export const GroupMemberInfoResponse = z.object({
  data: z.object({
    memberlist: z.preprocess(
      (memberList) => {
        if (
          typeof memberList === 'object' &&
          memberList !== null &&
          '' in memberList
        ) {
          delete memberList[''];
        }

        return memberList;
      },
      z.record(z.string(), MemberInfo),
    ),
  }),
});

export type GroupMemberInfoResponse = z.infer<typeof GroupMemberInfoResponse>;

export interface GroupUpdateRequest {
  clan: '3';
  'clan-checkbox': 'on';
  'private-group-checkbox'?: 'on';
  name: string;
  members: string;
  leaders: string;
  id: string;
  key: string;
}

export const GameMode = {
  Main: 0,
  Ironman: 1,
  UltimateIronman: 2,
  HardcoreIronman: 3,
} as const;

/**
 * Temple's `GIM` field doubles as the group size: 0 is not a group ironman,
 * 12–15 are regular groups of 2–5, and 22–25 are hardcore groups of 2–5. Only
 * the tens digit distinguishes the two, so that is all we read.
 */
export const GimMode = {
  None: 0,
  Regular: 1,
  Hardcore: 2,
} as const;

function parseGimMode(gim: number) {
  if (gim === GimMode.None) {
    return GimMode.None;
  }

  return Math.floor(gim / 10) === GimMode.Hardcore
    ? GimMode.Hardcore
    : GimMode.Regular;
}

/**
 * Resolves a Temple account into the game mode we store on the player record.
 * Group membership wins over `Game mode`, which reports a group ironman as a
 * plain ironman.
 *
 * @param gameMode - The 'Game mode' field from Temple API
 * @param gim - The 'GIM' field from Temple API
 */
export function parseAccountType(gameMode: number, gim: number): AccountType {
  switch (parseGimMode(gim)) {
    case GimMode.Hardcore:
      return 'hardcore_group_ironman';
    case GimMode.Regular:
      return 'group_ironman';
    default:
      break;
  }

  switch (gameMode) {
    case GameMode.Ironman:
      return 'ironman';
    case GameMode.UltimateIronman:
      return 'ultimate_ironman';
    case GameMode.HardcoreIronman:
      return 'hardcore_ironman';
    default:
      return 'main';
  }
}

/**
 * The account type Temple can actually be trusted for, or null when it cannot
 * tell.
 *
 * Temple reports `Game mode` 0 / `GIM` 0 for a main — and for every group
 * ironman whose group it does not know about. Its group data is opt-in ("each
 * member of your party must track their account individually on TempleOSRS"),
 * so a `main` reading is not evidence of a main: it is the absence of
 * evidence, and members of ranked groups come back as mains all the time.
 * Everything else it reports is read straight off the individual hiscore
 * boards and is sound.
 *
 * So: anything but a main is authoritative, and a main means "ask the player".
 *
 * @param gameMode - The 'Game mode' field from Temple API
 * @param gim - The 'GIM' field from Temple API
 */
export function resolveTempleAccountType(
  gameMode: number,
  gim: number,
): AccountType | null {
  const accountType = parseAccountType(gameMode, gim);

  return isMainAccount(accountType) ? null : accountType;
}

/**
 * Determines if a player is an ironman based on Temple API data
 * @param gameMode - The 'Game mode' field from Temple API
 * @param gim - The 'GIM' field from Temple API
 * @returns boolean - true if player is any ironman variant, false if main
 */
export function isPlayerIronman(gameMode: number, gim: number): boolean {
  return !isMainAccount(parseAccountType(gameMode, gim));
}

export const TempleOSRSPlayerStats = z.object({
  data: z.object({
    info: z.object({
      Username: z.string(),
      'Game mode': z.number(),
      GIM: z.number(),
      Primary_ehb: z.enum(['Ehb', 'Im_ehb', 'Uim_ehb']),
      Primary_ehp: z.enum(['Ehp', 'Im_ehp', 'Uim_ehp']),
    }),
    Overall_level: z.number().nonnegative(),
    Overall: z.number().nonnegative(),
    Ehb: z.number().nonnegative(),
    Ehp: z.number().nonnegative(),
    Im_ehb: z.number().nonnegative(),
    Im_ehp: z.number().nonnegative(),
    Uim_ehb: z.number().nonnegative(),
    Uim_ehp: z.number().nonnegative(),
    Collections: z.number().nonnegative(),
    'TzKal-Zuk': z.number().nonnegative(),
    Clue_all: z.number().nonnegative(),
    Clue_beginner: z.number().nonnegative(),
    Clue_easy: z.number().nonnegative(),
    Clue_medium: z.number().nonnegative(),
    Clue_hard: z.number().nonnegative(),
    Clue_elite: z.number().nonnegative(),
    Clue_master: z.number().nonnegative(),
  }),
});

export type TempleOSRSPlayerStats = z.infer<typeof TempleOSRSPlayerStats>;

export interface PlayerStatsError {
  error: {
    Code: number;
    Message: string;
  };
}

const sqlDateStringToDate = z.string().transform((value, ctx) => {
  // Convert "YYYY-MM-DD HH:mm:ss"
  // → ISO format "YYYY-MM-DDTHH:mm:ss"
  const iso = value.replace(' ', 'T');

  const date = new Date(iso);

  if (isNaN(date.getTime())) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Invalid date format',
    });
    return z.NEVER;
  }

  return date;
});

const TempleOSRSCollectionLogItem = z.object({
  count: z.number().nonnegative(),
  id: z.number().nonnegative(),
  name: z.string().min(1),
  date: sqlDateStringToDate,
});

export type TempleOSRSCollectionLogItem = z.infer<
  typeof TempleOSRSCollectionLogItem
>;

export const TempleOSRSPlayerCollectionLog = z.object({
  data: z.object({
    total_collections_available: z.number().nonnegative(),
    total_collections_finished: z.number().nonnegative(),
    items: z.array(TempleOSRSCollectionLogItem),
  }),
});

export type TempleOSRSPlayerCollectionLog = z.infer<
  typeof TempleOSRSPlayerCollectionLog
>;

export const TempleOSRSCollectionLogCategory = z.enum([
  'all',
  'bosses',
  'raids',
  'clues',
  'minigames',
  'other',
  'abyssal_sire',
  'alchemical_hydra',
  'amoxliatl',
  'araxxor',
  'barrows_chests',
  'bryophyta',
  'callisto_and_artio',
  'cerberus',
  'chaos_elemental',
  'chaos_fanatic',
  'commander_zilyana',
  'corporeal_beast',
  'crazy_archaeologist',
  'dagannoth_kings',
  'duke_sucellus',
  'the_fight_caves',
  'fortis_colosseum',
  'the_gauntlet',
  'general_graardor',
  'giant_mole',
  'grotesque_guardians',
  'hespori',
  'hueycoatl',
  'the_inferno',
  'kalphite_queen',
  'king_black_dragon',
  'kraken',
  'kree_arra',
  'kril_tsutsaroth',
  'the_leviathan',
  'moons_of_peril',
  'nex',
  'the_nightmare',
  'obor',
  'phantom_muspah',
  'royal_titans',
  'sarachnis',
  'scorpia',
  'scurrius',
  'skotizo',
  'tempoross',
  'thermonuclear_smoke_devil',
  'vardorvis',
  'venenatis_and_spindel',
  'vetion_and_calvarion',
  'vorkath',
  'the_whisperer',
  'wintertodt',
  'yama',
  'zalcano',
  'zulrah',
  'chambers_of_xeric',
  'theatre_of_blood',
  'tombs_of_amascut',
  'beginner_treasure_trails',
  'easy_treasure_trails',
  'medium_treasure_trails',
  'hard_treasure_trails',
  'elite_treasure_trails',
  'master_treasure_trails',
  'gilded',
  'third_age',
  'mimic',
  'shared_treasure_trail_rewards',
  'barbarian_assault',
  'brimhaven_agility_arena',
  'castle_wars',
  'fishing_trawler',
  'giants_foundry',
  'gnome_restaurant',
  'guardians_of_the_rift',
  'hallowed_sepulchre',
  'last_man_standing',
  'magic_training_arena',
  'mahogany_homes',
  'pest_control',
  'mastering_mixology',
  'rogues_den',
  'shades_of_mortton',
  'soul_wars',
  'temple_trekking',
  'tithe_farm',
  'trouble_brewing',
  'volcanic_mine',
  'aerial_fishing',
  'all_pets',
  'camdozaal',
  'champions_challenge',
  'chaos_druids',
  'chompy_bird_hunting',
  'colossal_wyrm_agility',
  'creature_creation',
  'cyclopes',
  'forestry',
  'fossil_island_notes',
  'gloughs_experiments',
  'hunter_guild',
  'monkey_backpacks',
  'motherlode_mine',
  'my_notes',
  'random_events',
  'revenants',
  'rooftop_agility',
  'shayzien_armour',
  'shooting_stars',
  'skilling_pets',
  'slayer',
  'tormented_demons',
  'tzhaar',
  'miscellaneous',
  'doom_of_mokhaiotl',
  'maggot_king',
  'the_mad_angel',
]);

export type TempleOSRSCollectionLogCategory = z.infer<
  typeof TempleOSRSCollectionLogCategory
>;

export const TempleOSRSConstants = z.object({
  data: z.object({
    MAX_COLLECTION_LOGS: z.number().nonnegative(),
  }),
});

export type TempleOSRSConstants = z.infer<typeof TempleOSRSConstants>;
