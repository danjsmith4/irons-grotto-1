import 'server-only';
import {
  getClanEventsAwaitingResults,
  recordClanEventWin,
  resolveClanPlayerName,
} from '@/lib/db/clan-event-operations';
import { fetchTempleCompetition } from './fetch-temple-competition';

/**
 * Fills in the winner of any event that has finished without one recorded.
 *
 * Stateless in the same way accomplishment detection is: it asks Temple what
 * the standings say and writes what is missing, so re-running is free and a
 * run that never happened is caught up by the next one rather than lost. There
 * is no cron here — it is called from the two places that already load event
 * data (the admin pane and the status endpoint).
 *
 * A win is only recorded for a *tracked clan member*. The linked Temple group
 * can contain accounts this site has never seen, and the wins table is keyed
 * on the player name, so an untracked winner is skipped rather than filed
 * under a name nothing else knows.
 */
export async function syncClanEventResults(now = new Date()): Promise<number> {
  let recorded = 0;

  try {
    const pending = await getClanEventsAwaitingResults(now);

    for (const event of pending) {
      // Sequential on purpose — Temple is rate limited and this runs off a
      // page load, where three quick calls matter less than being a good
      // citizen. `pending` is bounded to a handful.
      const competition = await fetchTempleCompetition(event.id);

      if (!competition) {
        continue;
      }

      // Nobody gaining anything is a real result — an event with no winner
      // stays without one rather than crowning whoever sits at the top of an
      // all-zero table.
      const [leader] = competition.participants.filter(
        ({ gained }) => gained > 0,
      );

      if (!leader) {
        continue;
      }

      const playerName = await resolveClanPlayerName(leader.username);

      if (!playerName) {
        console.warn(
          `Clan event ${event.id} was won by "${leader.username}", who is not a tracked member.`,
        );

        continue;
      }

      await recordClanEventWin({
        eventId: event.id,
        playerName,
        gained: Math.round(leader.gained),
      });

      recorded += 1;
    }
  } catch (error) {
    // Never the point of the request that triggered it.
    console.error('Failed to sync clan event results:', error);
  }

  return recorded;
}
