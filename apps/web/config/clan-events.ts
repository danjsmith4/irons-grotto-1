/**
 * Skill of the Week / Boss of the Week — the clan's recurring TempleOSRS
 * competitions.
 *
 * Everything here is the *shape* of an event. The schedule maths lives in
 * `app/utils/clan-event-schedule.ts` (pure, spec'd) and the Temple calls live
 * in `app/data-sources/`.
 */

export const clanEventTypes = ['sotw', 'botw'] as const;

export type ClanEventType = (typeof clanEventTypes)[number];

export const clanEventTypeLabels: Record<ClanEventType, string> = {
  sotw: 'Skill of the Week',
  botw: 'Boss of the Week',
};

/** The suffix the competition is named with on Temple, e.g. "Thieving SOTW". */
export const clanEventTypeSuffix: Record<ClanEventType, string> = {
  sotw: 'SOTW',
  botw: 'BOTW',
};

/** What a participant's `xp_gained` actually counts, per event type. */
export const clanEventGainLabel: Record<ClanEventType, string> = {
  sotw: 'XP',
  botw: 'KC',
};

/**
 * Where a newly created competition is handed to the clan Discord bot.
 *
 * ⚠️ The message carries the competition's **edit key**, so whoever can read
 * this channel can edit or delete the competition. Point it somewhere staff
 * already trust with that.
 */
export const clanEventAnnouncementChannelId = '1058503652672819260';

/** The bot's command for each event type — its syntax, not ours. */
export const clanEventBotCommand: Record<ClanEventType, string> = {
  sotw: '.sotw',
  botw: '.botw',
};

export interface ClanEventMetric {
  /**
   * TempleOSRS's own id for the skill or boss — the `skill` parameter of
   * `competition_create.php`, and what `competition_info.php` returns as
   * `skill_index`. Taken from Temple's competition-create picker; the numbers
   * for skills happen to match the OSRS hiscore order, but the boss numbers
   * are Temple's alone, so they are recorded here rather than derived.
   */
  id: number;
  /** Temple's display name, which is also what it echoes back as `skill`. */
  name: string;
  /**
   * OSRS Wiki image name, rendered through `formatWikiImageUrl`. Several
   * bosses have no article image under their own name, so these are the file
   * names that actually resolve (verified against the wiki) rather than a
   * guess derived from `name` — `ItemImageWithFallback` degrades to an initial
   * if the wiki ever renames one.
   */
  icon: string;
}

/**
 * The skills a Skill of the Week can run on.
 *
 * **The six combat skills are deliberately absent** — Attack (1), Strength
 * (3), Defence (2), Ranged (5), Magic (7) and Hitpoints (4). A skilling
 * competition on a combat skill is really a bossing competition with worse
 * scoring, and Hitpoints cannot be trained on its own at all. Boss of the Week
 * is where combat belongs.
 *
 * `Overall`, `EHP` and its variants are absent for a different reason: a skill
 * of the week is one skill.
 */
export const sotwSkills: ClanEventMetric[] = [
  { id: 17, name: 'Agility', icon: 'Agility_icon' },
  { id: 23, name: 'Construction', icon: 'Construction_icon' },
  { id: 8, name: 'Cooking', icon: 'Cooking_icon' },
  { id: 13, name: 'Crafting', icon: 'Crafting_icon' },
  { id: 20, name: 'Farming', icon: 'Farming_icon' },
  { id: 12, name: 'Firemaking', icon: 'Firemaking_icon' },
  { id: 11, name: 'Fishing', icon: 'Fishing_icon' },
  { id: 10, name: 'Fletching', icon: 'Fletching_icon' },
  { id: 16, name: 'Herblore', icon: 'Herblore_icon' },
  { id: 22, name: 'Hunter', icon: 'Hunter_icon' },
  { id: 15, name: 'Mining', icon: 'Mining_icon' },
  { id: 6, name: 'Prayer', icon: 'Prayer_icon' },
  { id: 21, name: 'Runecraft', icon: 'Runecraft_icon' },
  { id: 119, name: 'Sailing', icon: 'Sailing_icon' },
  { id: 19, name: 'Slayer', icon: 'Slayer_icon' },
  { id: 14, name: 'Smithing', icon: 'Smithing_icon' },
  { id: 18, name: 'Thieving', icon: 'Thieving_icon' },
  { id: 9, name: 'Woodcutting', icon: 'Woodcutting_icon' },
];

/**
 * Temple's ids for the six combat skills, kept so the exclusion above is
 * checkable rather than a gap you have to notice.
 */
export const combatSkillMetricIds = [1, 2, 3, 4, 5, 7];

/**
 * The bosses and boss-shaped content a Boss of the Week can be run on.
 *
 * Not every id Temple offers: its picker also carries EHB variants, clue
 * tiers, LMS and the "combined" aggregates, none of which are a boss. Names
 * are Temple's verbatim, because that is what `competition_info.php` echoes
 * back and what the competition ends up called.
 */
export const botwBosses: ClanEventMetric[] = [
  { id: 33, name: 'Abyssal Sire', icon: 'Abyssal_Sire' },
  { id: 34, name: 'Alchemical Hydra', icon: 'Alchemical_Hydra_(serpentine)' },
  { id: 111, name: 'Amoxliatl', icon: 'Amoxliatl' },
  { id: 109, name: 'Araxxor', icon: 'Araxxor' },
  { id: 96, name: 'Artio', icon: 'Artio' },
  { id: 35, name: 'Barrows Chests', icon: 'Ahrim_the_Blighted' },
  { id: 121, name: 'Brutus', icon: 'Brutus' },
  { id: 36, name: 'Bryophyta', icon: 'Bryophyta' },
  { id: 37, name: 'Callisto', icon: 'Callisto' },
  { id: 97, name: 'Calvarion', icon: "Calvar'ion" },
  { id: 38, name: 'Cerberus', icon: 'Cerberus' },
  { id: 39, name: 'Chambers of Xeric', icon: 'Chambers_of_Xeric_logo' },
  {
    id: 40,
    name: 'Chambers of Xeric Challenge Mode',
    icon: 'Chambers_of_Xeric_logo',
  },
  { id: 41, name: 'Chaos Elemental', icon: 'Chaos_Elemental' },
  { id: 42, name: 'Chaos Fanatic', icon: 'Chaos_Fanatic' },
  { id: 43, name: 'Commander Zilyana', icon: 'Commander_Zilyana' },
  { id: 44, name: 'Corporeal Beast', icon: 'Corporeal_Beast' },
  { id: 45, name: 'Crazy Archaeologist', icon: 'Crazy_archaeologist' },
  { id: 46, name: 'Dagannoth Prime', icon: 'Dagannoth_Prime' },
  { id: 47, name: 'Dagannoth Rex', icon: 'Dagannoth_Rex' },
  { id: 48, name: 'Dagannoth Supreme', icon: 'Dagannoth_Supreme' },
  { id: 49, name: 'Deranged Archaeologist', icon: 'Deranged_archaeologist' },
  { id: 118, name: 'Doom of Mokhaiotl', icon: 'Doom_of_Mokhaiotl' },
  { id: 100, name: 'Duke Sucellus', icon: 'Duke_Sucellus' },
  { id: 50, name: 'General Graardor', icon: 'General_Graardor' },
  { id: 51, name: 'Giant Mole', icon: 'Giant_Mole' },
  { id: 52, name: 'Grotesque Guardians', icon: 'Dusk' },
  { id: 53, name: 'Hespori', icon: 'Hespori' },
  { id: 54, name: 'Kalphite Queen', icon: 'Kalphite_Queen' },
  { id: 55, name: 'King Black Dragon', icon: 'King_Black_Dragon' },
  { id: 56, name: 'Kraken', icon: 'Kraken' },
  { id: 57, name: 'KreeArra', icon: "Kree'arra" },
  { id: 58, name: 'Kril Tsutsaroth', icon: "K'ril_Tsutsaroth" },
  { id: 106, name: 'Lunar Chests', icon: 'Blood_moon_helm' },
  { id: 123, name: 'Mad Angel', icon: 'Mad_Angel' },
  { id: 122, name: 'Maggot King', icon: 'Maggot_King' },
  { id: 59, name: 'Mimic', icon: 'Mimic' },
  { id: 89, name: 'Nex', icon: 'Nex' },
  { id: 82, name: 'Nightmare', icon: 'The_Nightmare' },
  { id: 60, name: 'Obor', icon: 'Obor' },
  { id: 95, name: 'Phantom Muspah', icon: 'Phantom_Muspah_(ranged)' },
  { id: 88, name: "Phosani's Nightmare", icon: 'The_Nightmare' },
  { id: 90, name: 'Rift', icon: 'Guardians_of_the_Rift' },
  { id: 61, name: 'Sarachnis', icon: 'Sarachnis' },
  { id: 62, name: 'Scorpia', icon: 'Scorpia' },
  { id: 104, name: 'Scurrius', icon: 'Scurrius' },
  { id: 120, name: 'Shellbane Gryphon', icon: 'Shellbane_gryphon' },
  { id: 63, name: 'Skotizo', icon: 'Skotizo' },
  { id: 107, name: 'Sol Heredit', icon: 'Sol_Heredit' },
  { id: 98, name: 'Spindel', icon: 'Spindel' },
  { id: 84, name: 'Tempoross', icon: 'Tempoross' },
  { id: 65, name: 'The Corrupted Gauntlet', icon: 'Corrupted_Hunllef' },
  { id: 64, name: 'The Gauntlet', icon: 'Crystalline_Hunllef' },
  { id: 110, name: 'The Hueycoatl', icon: 'The_Hueycoatl' },
  { id: 101, name: 'The Leviathan', icon: 'The_Leviathan' },
  { id: 115, name: 'The Royal Titans', icon: 'Branda_the_Fire_Queen' },
  { id: 102, name: 'The Whisperer', icon: 'The_Whisperer' },
  { id: 66, name: 'Theatre of Blood', icon: 'Theatre_of_Blood_logo' },
  {
    id: 85,
    name: 'Theatre of Blood Hard Mode',
    icon: 'Theatre_of_Blood_logo',
  },
  {
    id: 67,
    name: 'Thermonuclear Smoke Devil',
    icon: 'Thermonuclear_smoke_devil',
  },
  { id: 93, name: 'Tombs of Amascut', icon: 'Tombs_of_Amascut' },
  { id: 94, name: 'Tombs of Amascut Expert', icon: 'Tombs_of_Amascut' },
  { id: 68, name: 'TzKal-Zuk', icon: 'TzKal-Zuk' },
  { id: 69, name: 'TzTok-Jad', icon: 'TzTok-Jad' },
  { id: 103, name: 'Vardorvis', icon: 'Vardorvis' },
  { id: 70, name: 'Venenatis', icon: 'Venenatis' },
  { id: 71, name: 'Vetion', icon: "Vet'ion" },
  { id: 72, name: 'Vorkath', icon: 'Vorkath' },
  { id: 73, name: 'Wintertodt', icon: 'Burnt_page' },
  { id: 117, name: 'Yama', icon: 'Yama' },
  { id: 74, name: 'Zalcano', icon: 'Zalcano' },
  { id: 75, name: 'Zulrah', icon: 'Zulrah_(serpentine)' },
];

export const clanEventMetrics: Record<ClanEventType, ClanEventMetric[]> = {
  sotw: sotwSkills,
  botw: botwBosses,
};

/**
 * The alternation rule, and the whole of it: one type follows the other, so
 * the next event's type is never a choice a moderator makes. `null` — nothing
 * recorded yet — starts the ladder at a skill week.
 */
export function nextClanEventType(
  previous: ClanEventType | null,
): ClanEventType {
  return previous === 'sotw' ? 'botw' : 'sotw';
}

/**
 * Which kind of event tracks this metric.
 *
 * Temple has one id space for skills and bosses, so an imported competition's
 * `skill_index` is enough to say whether it was a skill week or a boss week —
 * no moderator has to classify it, and no import can misfile one.
 */
export function clanEventTypeForMetric(metricId: number): ClanEventType | null {
  return (
    clanEventTypes.find((type) =>
      clanEventMetrics[type].some(({ id }) => id === metricId),
    ) ?? null
  );
}

export function findClanEventMetric(
  type: ClanEventType,
  metricId: number,
): ClanEventMetric | null {
  return clanEventMetrics[type].find(({ id }) => id === metricId) ?? null;
}

export function defaultClanEventName(
  type: ClanEventType,
  metricName: string,
): string {
  return `${metricName} ${clanEventTypeSuffix[type]}`;
}
