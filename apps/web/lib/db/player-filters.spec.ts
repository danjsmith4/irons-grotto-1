import { SQL, ne } from 'drizzle-orm';
import { PgDialect } from 'drizzle-orm/pg-core';
import { isNotMainAccount, rankedMember } from './player-filters';
import { players } from './schema';

/**
 * These filters decide who appears on the leaderboard, so the SQL they build
 * is worth pinning — particularly the null handling, which regresses silently
 * rather than loudly.
 */
const toSql = (clause: SQL) => new PgDialect().sqlToQuery(clause).sql;

describe('isNotMainAccount', () => {
  it('excludes mains', () => {
    expect(toSql(isNotMainAccount)).toBe(
      `("players"."account_type" is distinct from 'main')`,
    );
  });

  /**
   * `NULL <> 'main'` evaluates to NULL, not true, so a bare inequality would
   * hide every member whose game mode has not been established yet — exactly
   * the accounts the calculator is still asking about.
   */
  it('keeps unresolved accounts, which a bare inequality would drop', () => {
    expect(toSql(isNotMainAccount)).toContain('is distinct from');
    expect(toSql(ne(players.accountType, 'main'))).not.toContain(
      'is distinct from',
    );
  });
});

describe('rankedMember', () => {
  it('requires an active account and excludes mains', () => {
    expect(toSql(rankedMember)).toBe(
      `("players"."is_active" = true and ("players"."account_type" is distinct from 'main'))`,
    );
  });
});
