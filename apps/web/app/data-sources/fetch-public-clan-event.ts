import 'server-only';
import { getCurrentAndNextClanEvents } from '@/lib/db/clan-event-operations';
import {
  toClanEventSummary,
  type ClanEventSummary,
} from './fetch-clan-event-status';
import { fetchTempleCompetition } from './fetch-temple-competition';

export interface PublicActiveClanEvent extends ClanEventSummary {
  /**
   * How many accounts are entered, or null when Temple could not be read.
   *
   * Null is "unknown", never zero — a competition always has entrants, so a
   * zero here could only ever be a lie about an outage.
   */
  participantCount: number | null;
}

export interface PublicClanEventStatus {
  active: PublicActiveClanEvent | null;
  next: ClanEventSummary | null;
}

/**
 * Which event is running and which is queued — from our own database, and
 * nothing else.
 *
 * This is what the public homepage renders on the server. It is one query, it
 * cannot fail slowly, and in particular it does **not** touch TempleOSRS: the
 * landing page is the clan's front door and must not wait on a third party to
 * paint. The participant count is the only part that needs Temple, and it
 * arrives afterwards through `GET /api/clan-events/public`.
 */
export async function fetchPublicClanEventFacts(): Promise<
  | {
      success: true;
      data: { active: ClanEventSummary | null; next: ClanEventSummary | null };
    }
  | { success: false; error: string }
> {
  try {
    const { active, next } = await getCurrentAndNextClanEvents();

    return {
      success: true,
      data: {
        active: active ? toClanEventSummary(active) : null,
        next: next ? toClanEventSummary(next) : null,
      },
    };
  } catch (error) {
    console.error('Failed to fetch public clan event facts:', error);

    return { success: false, error: String(error) };
  }
}

/**
 * The same events, plus how many people are in the running one.
 *
 * ⚠️ **Deliberately not `fetchClanEventStatus`.** That one is the signed-in
 * nav bar's view and differs in two ways that matter here:
 *
 * - It runs `syncClanEventResults`, a write. Recording finished events rides
 *   member page loads on purpose; hanging it off an anonymous endpoint would
 *   put a write path in front of every stranger who opens the homepage.
 * - It returns the standings, which are member names. A visitor who is not in
 *   the clan gets the aggregate — that an event is running and how many are in
 *   it — and no roster. The full standings are a click away on Temple for
 *   anyone who actually wants them.
 *
 * The Temple read underneath is cached for three minutes, so this stays cheap
 * however many people ask.
 */
export async function fetchPublicClanEventStatus(): Promise<
  | { success: true; data: PublicClanEventStatus }
  | { success: false; error: string }
> {
  const facts = await fetchPublicClanEventFacts();

  if (!facts.success) {
    return facts;
  }

  const { active, next } = facts.data;

  if (!active) {
    return { success: true, data: { active: null, next } };
  }

  const competition = await fetchTempleCompetition(active.id);

  return {
    success: true,
    data: {
      active: {
        ...active,
        participantCount: competition?.participantCount ?? null,
      },
      next,
    },
  };
}
