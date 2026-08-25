import 'server-only';
import {
  clanEventTypeLabels,
  findClanEventMetric,
  type ClanEventType,
} from '@/config/clan-events';
import {
  getActiveClanEvent,
  getUpcomingClanEvent,
} from '@/lib/db/clan-event-operations';
import type { ClanEventRow } from '@/lib/db/schema';
import { fetchTempleCompetition } from './fetch-temple-competition';
import { syncClanEventResults } from './sync-clan-event-results';

/** One row of the standings the status modal shows. */
export interface ClanEventStanding {
  position: number;
  playerName: string;
  gained: number;
}

export interface ClanEventSummary {
  id: number;
  type: ClanEventType;
  typeLabel: string;
  name: string;
  metricName: string;
  /** OSRS Wiki image name, or null when the metric is not one we model. */
  icon: string | null;
  /** ISO 8601 — this crosses an API boundary, so it is not a Date. */
  startsAt: string;
  endsAt: string;
}

export interface ActiveClanEvent extends ClanEventSummary {
  participantCount: number;
  /** Top five, highest gain first. Empty until someone gains something. */
  standings: ClanEventStanding[];
  /** True when Temple could not be read — the standings are unknown, not zero. */
  standingsUnavailable: boolean;
}

export interface ClanEventStatus {
  active: ActiveClanEvent | null;
  next: ClanEventSummary | null;
}

/** How many standings rows the modal shows. */
const standingsSize = 5;

export function toClanEventSummary(event: ClanEventRow): ClanEventSummary {
  return {
    id: event.id,
    type: event.type,
    typeLabel: clanEventTypeLabels[event.type],
    name: event.name,
    metricName: event.metricName,
    icon: findClanEventMetric(event.type, event.metricId)?.icon ?? null,
    startsAt: event.startsAt.toISOString(),
    endsAt: event.endsAt.toISOString(),
  };
}

/**
 * What the nav-bar status indicator and its modal render.
 *
 * Standings come from Temple live and are allowed to be missing: the event
 * itself is ours and is worth showing even when Temple is unreachable, so a
 * failed read is reported as "unavailable" rather than as an empty table.
 */
export async function fetchClanEventStatus(): Promise<
  { success: true; data: ClanEventStatus } | { success: false; error: string }
> {
  try {
    const now = new Date();

    // Cheap when there is nothing to do, and this is the endpoint most likely
    // to be hit shortly after an event ends.
    await syncClanEventResults(now);

    const [activeRow, nextRow] = await Promise.all([
      getActiveClanEvent(now),
      getUpcomingClanEvent(now),
    ]);

    let active: ActiveClanEvent | null = null;

    if (activeRow) {
      const competition = await fetchTempleCompetition(activeRow.id);

      active = {
        ...toClanEventSummary(activeRow),
        participantCount: competition?.participantCount ?? 0,
        standings: (competition?.participants ?? [])
          .filter(({ gained }) => gained > 0)
          .slice(0, standingsSize)
          .map(({ username, gained }, index) => ({
            position: index + 1,
            playerName: username.replaceAll('_', ' '),
            gained,
          })),
        standingsUnavailable: !competition,
      };
    }

    return {
      success: true,
      data: {
        active,
        next: nextRow ? toClanEventSummary(nextRow) : null,
      },
    };
  } catch (error) {
    console.error('Failed to fetch clan event status:', error);

    return { success: false, error: String(error) };
  }
}
