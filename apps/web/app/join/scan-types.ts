import type { CombatAchievementTier } from '@/app/schemas/osrs';
import type { AccountType } from '@/app/schemas/staff';

/**
 * What each source of the onboarding scan reports back.
 *
 * One type per source, and one server action per type, because the experience
 * shows the player a row per source with its own pending state. A single
 * "scan everything" action would resolve all five at once and every tick would
 * land in the same frame — the sequence is the point, so the requests are
 * genuinely separate and genuinely parallel. Nothing here is synthetic: a row
 * only ever ticks because its own request came back.
 */

/**
 * Whether a name is free to register, checked the moment it is submitted.
 *
 * Three outcomes rather than a boolean, because the two ways a name can be
 * taken need different answers: an account the member already owns is one click
 * from being useful to them, and an account somebody else owns is not their
 * problem to solve.
 */
export type NameAvailability =
  | { status: 'available' }
  /** This Discord account already registered it. */
  | { status: 'yours'; playerName: string }
  /** Another member registered it. */
  | { status: 'taken'; playerName: string };

export interface HiscoresScan {
  /** The name exists on the OSRS hiscores. */
  exists: boolean;
}

export interface TempleScan {
  /** TempleOSRS has a record for this account. */
  isTracked: boolean;
  /** We registered it during this scan rather than finding it already there. */
  didRegister: boolean;
  /** Null means Temple could not settle it — the player is asked instead. */
  accountType: AccountType | null;
  totalLevel: number | null;
  isMaxed: boolean;
  hasInfernal: boolean;
  /**
   * Efficient hours bossed and played, **at the ironman rates**.
   *
   * Not Temple's `Primary_ehb` / `Primary_ehp`, which point at whichever rate
   * matches the account's own game mode. This is an ironman clan and the
   * calculator scores everyone against ironman EHB rates
   * (`config/efficiency-rates.ts`), so showing a main their main-rate hours
   * here would be a number that means something different from every other
   * number on the site.
   */
  ehb: number | null;
  ehp: number | null;
  /**
   * Collection log slots as the *hiscores* count them, which Temple mirrors.
   * Compared against the collection log scan's own count to tell whether the
   * player's Temple sync has fallen behind.
   */
  hiscoresClogSlots: number | null;
}

export interface CollectionLogScan {
  /** TempleOSRS answered with a collection log at all. */
  hasCollectionLog: boolean;
  clogSlots: number | null;
  clogTotal: number | null;
  hasFangKit: boolean;
  /** Efficient hours collected, at the ironman rate — as with `ehb`/`ehp`. */
  ehc: number | null;
}

export interface AchievementScan {
  /** The RuneLite WikiSync plugin has uploaded for this account. */
  hasWikiSync: boolean;
  hasBlorva: boolean;
  hasQuiver: boolean;
  hasZukHelm: boolean;
  combatAchievementTier: CombatAchievementTier | null;
}

export interface ClanRecordScan {
  /** ISO date string, or null when the clan's member list has no record. */
  joinDate: string | null;
  /** The player appears on the latest clan member list. */
  isClanMember: boolean;
  /** The clan list's casing of the name, which is the canonical one. */
  rsn: string;
}

/**
 * The headline achievements the leaderboard shows, revealed as their source
 * lands.
 *
 * Radiant Oathplate is deliberately absent. Every other item here is derived
 * from a source — Temple's boss kill counts, the collection log, or WikiSync's
 * combat achievements — but nothing reports Radiant, so it exists only as a
 * claim the player ticks in the calculator. There is nothing to light up.
 */
export type AchievementKey =
  | 'blorva'
  | 'infernal'
  | 'quiver'
  | 'fangKit'
  | 'zukHelm'
  | 'maxed';

export interface AchievementDefinition {
  key: AchievementKey;
  /** OSRS Wiki image name. */
  image: string;
  label: string;
  /** Which scan settles it — drives the order they light up in. */
  source: 'temple' | 'collectionLog' | 'achievements';
}

export const achievementDefinitions: AchievementDefinition[] = [
  {
    key: 'infernal',
    image: 'Infernal_cape',
    label: 'Infernal cape',
    source: 'temple',
  },
  {
    key: 'maxed',
    image: 'Max_cape',
    label: 'Maxed',
    source: 'temple',
  },
  {
    key: 'fangKit',
    image: 'Cursed_phalanx',
    label: 'Cursed phalanx',
    source: 'collectionLog',
  },
  {
    key: 'blorva',
    image: 'Ancient_blood_ornament_kit',
    label: 'Blood Torva',
    source: 'achievements',
  },
  {
    // `Blessed_dizana's_quiver` does not exist on the wiki — the file is
    // `Dizana's_quiver`. Verify a new name against
    // https://oldschool.runescape.wiki/images/thumb/<name>.png/64px-<name>.png
    // before adding it; a 404 here renders as the alt text sprawling across the
    // row rather than as a missing image.
    key: 'quiver',
    image: "Dizana's_quiver",
    label: "Dizana's Quiver",
    source: 'achievements',
  },
  {
    key: 'zukHelm',
    image: 'Tzkal_slayer_helmet',
    label: 'Grandmaster CAs',
    source: 'achievements',
  },
];
