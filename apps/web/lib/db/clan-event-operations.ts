import 'server-only';
import { and, asc, desc, eq, gt, lte, sql } from 'drizzle-orm';
import { db } from './index';
import {
  clanEvents,
  clanEventWins,
  players,
  type ClanEventRow,
  type NewClanEventRow,
} from './schema';

/**
 * The stored side of SOTW/BOTW. Standings are never kept here — they are read
 * live from Temple — so everything below is about the schedule, the
 * alternation and who won.
 */

export interface ClanEventWithWinner extends ClanEventRow {
  winner: { playerName: string; gained: number } | null;
}

/** Newest first — the order the admin pane lists them in. */
export async function getClanEvents(
  limit = 20,
): Promise<ClanEventWithWinner[]> {
  const rows = await db
    .select({
      event: clanEvents,
      winnerName: clanEventWins.playerName,
      winnerGained: clanEventWins.gained,
    })
    .from(clanEvents)
    .leftJoin(
      clanEventWins,
      and(
        eq(clanEventWins.eventId, clanEvents.id),
        eq(clanEventWins.placement, 1),
      ),
    )
    .orderBy(desc(clanEvents.startsAt))
    .limit(limit);

  return rows.map(({ event, winnerName, winnerGained }) => ({
    ...event,
    winner: winnerName
      ? { playerName: winnerName, gained: winnerGained ?? 0 }
      : null,
  }));
}

/**
 * The most recently *scheduled* event, running or not.
 *
 * This is what the alternation reads: the next type follows whatever was
 * booked last, not whatever last finished, or creating an event while one is
 * queued would repeat a type.
 */
export async function getLatestClanEvent(): Promise<ClanEventRow | null> {
  const [row] = await db
    .select()
    .from(clanEvents)
    .orderBy(desc(clanEvents.startsAt))
    .limit(1);

  return row ?? null;
}

export async function getActiveClanEvent(
  now = new Date(),
): Promise<ClanEventRow | null> {
  const [row] = await db
    .select()
    .from(clanEvents)
    .where(and(lte(clanEvents.startsAt, now), gt(clanEvents.endsAt, now)))
    .orderBy(desc(clanEvents.startsAt))
    .limit(1);

  return row ?? null;
}

/** The queued event, of which there is at most one — see the schedule rules. */
export async function getUpcomingClanEvent(
  now = new Date(),
): Promise<ClanEventRow | null> {
  const [row] = await db
    .select()
    .from(clanEvents)
    .where(gt(clanEvents.startsAt, now))
    .orderBy(asc(clanEvents.startsAt))
    .limit(1);

  return row ?? null;
}

/**
 * Finished events with nobody recorded as having won them.
 *
 * Drives the results sync. Bounded because a long-dormant site should catch up
 * over a few page loads rather than making one request wait on a dozen Temple
 * calls.
 */
export async function getClanEventsAwaitingResults(
  now = new Date(),
  limit = 3,
): Promise<ClanEventRow[]> {
  return db
    .select({ event: clanEvents })
    .from(clanEvents)
    .leftJoin(clanEventWins, eq(clanEventWins.eventId, clanEvents.id))
    .where(
      and(lte(clanEvents.endsAt, now), sql`${clanEventWins.eventId} is null`),
    )
    .orderBy(desc(clanEvents.endsAt))
    .limit(limit)
    .then((rows) => rows.map(({ event }) => event));
}

export async function insertClanEvent(
  event: NewClanEventRow,
): Promise<ClanEventRow> {
  const [row] = await db.insert(clanEvents).values(event).returning();

  return row;
}

export async function getClanEventById(
  id: number,
): Promise<ClanEventRow | null> {
  const [row] = await db
    .select()
    .from(clanEvents)
    .where(eq(clanEvents.id, id))
    .limit(1);

  return row ?? null;
}

/**
 * Records a win. `do nothing` on conflict, because the sync re-reads finished
 * events and a win is a fact that does not change once the event has ended.
 */
export async function recordClanEventWin({
  eventId,
  playerName,
  gained,
  placement = 1,
}: {
  eventId: number;
  playerName: string;
  gained: number;
  placement?: number;
}): Promise<void> {
  await db
    .insert(clanEventWins)
    .values({ eventId, playerName, gained, placement })
    .onConflictDoNothing();
}

/**
 * Resolves a Temple username to the clan's spelling of it.
 *
 * Temple and the site agree on the name but not always on its casing or on
 * whether spaces are underscores, and the wins table is keyed on the player
 * name — a mismatch would file the same member twice. Returns null when the
 * account is not a tracked member, which is a real outcome: the group can
 * contain accounts this site has never seen.
 */
export async function resolveClanPlayerName(
  templeUsername: string,
): Promise<string | null> {
  const normalised = templeUsername.replaceAll('_', ' ').trim();

  const [row] = await db
    .select({ playerName: players.playerName })
    .from(players)
    .where(sql`lower(${players.playerName}) = lower(${normalised})`)
    .limit(1);

  return row?.playerName ?? null;
}

/** How many events each member has won, most wins first. */
export async function getClanEventWinCounts(
  limit = 10,
): Promise<{ playerName: string; wins: number }[]> {
  return db
    .select({
      playerName: clanEventWins.playerName,
      wins: sql<number>`count(*)::int`,
    })
    .from(clanEventWins)
    .where(eq(clanEventWins.placement, 1))
    .groupBy(clanEventWins.playerName)
    .orderBy(desc(sql`count(*)`))
    .limit(limit);
}
