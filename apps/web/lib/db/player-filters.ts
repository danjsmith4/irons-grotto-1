import { sql } from 'drizzle-orm';
import { players } from './schema';

/**
 * Excludes main accounts, **keeping unresolved ones**.
 *
 * `account_type` is nullable and null means "nobody has established this yet",
 * not "main" — the same reason `rankThresholdsFor` gives an unresolved account
 * the ironman ladder. `IS DISTINCT FROM` says exactly that, treating null as a
 * value rather than as unknown. Plain `<> 'main'` would be wrong: in SQL
 * `NULL <> 'main'` is NULL, which is not true, so every member the calculator
 * is still asking about would silently vanish from the leaderboard.
 */
export const isNotMainAccount = sql`(${players.accountType} is distinct from 'main')`;

/**
 * The members who count towards clan rankings: active, and not a main.
 *
 * Mains keep a calculator and appear in the activity feeds and collection-log
 * insights — they are members. What they are not is *ranked*, so anything that
 * places members against each other (the leaderboard, the clan standing
 * percentile) or measures the clan's own progress (Grotto at a glance) leaves
 * them out.
 */
export const rankedMember = sql`(${players.isActive} = true and ${isNotMainAccount})`;
