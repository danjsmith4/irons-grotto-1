import { z } from 'zod';

/**
 * The kind of accomplishment. Mirrors `accomplishmentTypeEnum` in
 * `lib/db/schema.ts` for the app layer, the same way `StaffRole` mirrors
 * `staffRoleEnum`.
 *
 * The type is the *whole* presentation decision: it picks the icon and the
 * wording of the feed row's second line. Detection — when a thing is earned —
 * lives in `app/utils/detect-accomplishments.ts`, and the numbers it compares
 * against live in `config/accomplishments.ts`. Adding a new accomplishment
 * means adding a value here, an icon below, and a rule there.
 */
export const AccomplishmentType = z.enum([
  'collection_log',
  'total_level',
  'ehb',
  'ehp',
  'maxed',
  'elite_diary',
  'diary_cape',
  'combat_achievement',
  'inferno',
  'colosseum',
  'blood_torva',
  'radiant_oathplate',
  'toa_cursed_phalanx',
  'pet',
]);

export type AccomplishmentType = z.infer<typeof AccomplishmentType>;

/**
 * The accomplishments a player earns repeatedly, once per threshold crossed.
 * Everything else is a one-off feat, earned exactly once.
 */
export const MilestoneAccomplishmentType = AccomplishmentType.extract([
  'collection_log',
  'total_level',
  'ehb',
  'ehp',
]);

export type MilestoneAccomplishmentType = z.infer<
  typeof MilestoneAccomplishmentType
>;

/**
 * The category shown above the accomplishment in the feed — what *kind* of
 * thing this is, where the stored label says which one.
 */
export const accomplishmentTypeLabels = {
  collection_log: 'Collection log',
  total_level: 'Total level',
  ehb: 'Efficient hours bossed',
  ehp: 'Efficient hours played',
  maxed: 'Maxed',
  elite_diary: 'Achievement diary',
  diary_cape: 'Achievement diary',
  combat_achievement: 'Combat achievements',
  inferno: 'The Inferno',
  colosseum: 'Fortis Colosseum',
  blood_torva: 'Cosmetic',
  radiant_oathplate: 'Cosmetic',
  toa_cursed_phalanx: 'Tombs of Amascut',
  pet: 'Pet',
} as const satisfies Record<AccomplishmentType, string>;

/**
 * The icon for each type, as an OSRS Wiki image name (resolved through
 * `formatWikiImageUrl`, exactly like collection-log item images).
 *
 * A row may override this with its own `iconItemName` where the accomplishment
 * names a specific item — a pet is its own picture. Every name here has been
 * checked against the wiki; a rename shows up as the fallback avatar in
 * `ItemImageWithFallback` rather than a broken image.
 */
export const accomplishmentTypeIcons = {
  collection_log: 'Collection log',
  total_level: 'Skills icon',
  ehb: 'Slayer icon',
  ehp: 'Stats icon',
  maxed: 'Max cape',
  elite_diary: 'Achievement Diaries',
  diary_cape: 'Achievement diary cape',
  combat_achievement: 'Combat achievements',
  inferno: 'Infernal cape',
  colosseum: "Dizana's quiver (uncharged)",
  // The wiki has no image filed under "Blood torva" — the blood-dyed Torva is
  // the sanguine ornament kit applied to the platebody.
  blood_torva: 'Sanguine torva platebody',
  radiant_oathplate: 'Radiant oathplate chest',
  toa_cursed_phalanx: 'Cursed phalanx',
  pet: 'Collection log',
} as const satisfies Record<AccomplishmentType, string>;
