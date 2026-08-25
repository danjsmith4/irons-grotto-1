import { z } from 'zod';
import { RankCalculatorSchema } from './submit-rank-calculator-validation';

/**
 * The fields a player may set for themselves.
 *
 * Deliberately a **pick**, not the whole schema. `RankCalculatorSchema` also
 * carries stats (`ehb`, `totalLevel`, clue counts) that are read-only in the UI
 * and owned by TempleOSRS/WikiSync, plus `rank` and `points`, which are decided
 * server-side. None of those may be asserted by the browser — the form renders
 * them, it does not get a vote on them.
 *
 * ⚠️ **This lives in its own module, not beside the action that validates
 * with it.** A `'use server'` file may only export async functions; Next strips
 * everything else from the client bundle, so importing this from there gave the
 * autosave hook `undefined` and `Object.keys(undefined)` threw on page load.
 * Anything both the client and a server action need has to sit outside the
 * action module.
 */
export const PlayerEditableSchema = RankCalculatorSchema.pick({
  acquiredItems: true,
  achievementDiaries: true,
  combatAchievementTier: true,
  tzhaarCape: true,
  hasBloodTorva: true,
  hasDizanasQuiver: true,
  hasRadiantOathplate: true,
  hasAchievementDiaryCape: true,
  proofLink: true,
}).partial();

export type PlayerEditableFields = z.infer<typeof PlayerEditableSchema>;
