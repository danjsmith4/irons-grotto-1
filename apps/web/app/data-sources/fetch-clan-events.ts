import 'server-only';
import { auth } from '@/auth';
import {
  clanEventGainLabel,
  clanEventTypeLabels,
  clanEventTypeSuffix,
  findClanEventMetric,
  nextClanEventType,
  type ClanEventType,
} from '@/config/clan-events';
import { canAccessAdminDashboard } from '@/app/utils/staff-permissions';
import { getStaffIdentityForDiscordUser } from '@/lib/db/staff-operations';
import {
  getClanEvents,
  getClanEventWinCounts,
  getLatestClanEvent,
} from '@/lib/db/clan-event-operations';
import { getClanEventDuty } from '@/lib/db/clan-event-duty-operations';
import {
  clanEventPhase,
  nextClanEventWindow,
} from '@/app/utils/clan-event-schedule';
import {
  selectClanEventPicker,
  type ClanEventPickerResult,
} from '@/app/utils/select-clan-event-picker';
import { fetchTempleCompetition } from './fetch-temple-competition';
import { syncClanEventResults } from './sync-clan-event-results';

export type { ClanEventPickerResult };

export interface AdminClanEvent {
  id: number;
  type: ClanEventType;
  typeLabel: string;
  name: string;
  metricName: string;
  icon: string | null;
  startsAt: string;
  endsAt: string;
  /** Whether Temple's edit key for this competition was captured. */
  hasCompetitionKey: boolean;
  createdBy: string | null;
  winner: {
    playerName: string;
    gained: number;
    isActiveMember: boolean;
  } | null;
}

/**
 * The slot a new event would occupy, and whether it may be created at all.
 *
 * The type is *not* a choice — SOTW and BOTW alternate — and neither are the
 * dates. They are sent to the client so the form can show what it is about to
 * do, and re-derived server-side when it does it.
 */
export interface NextClanEventSlot {
  type: ClanEventType;
  typeLabel: string;
  startsAt: string;
  endsAt: string;
  /** What the default competition name ends with, e.g. "SOTW". */
  nameSuffix: string;
  /** Null when the queue is free. Otherwise why the form is blocked. */
  blockedReason: string | null;
}

/** Who was rolled onto setting the next event up. */
export interface ClanEventDutySummary {
  playerName: string;
  rolledAt: string;
  rolledByPlayerName: string | null;
}

/**
 * The event running right now, for when the queue is full.
 *
 * ⚠️ **Only rendered while creation is blocked**, where it replaces the picker
 * and the duty roll. Both of those are about an event that, in that state, has
 * already been created — so naming who picks it, or who is on duty to set it
 * up, is describing a decision that has already been made. What a moderator
 * wants instead is where the running one stands and when it settles.
 */
export interface RunningClanEvent {
  name: string;
  typeLabel: string;
  endsAt: string;
  /** Whoever is ahead, or null when nobody has gained anything yet. */
  leader: { playerName: string; gained: number } | null;
  /** Temple could not be read, so "no leader" is unknown rather than nobody. */
  standingsUnavailable: boolean;
  /** Kill count for a boss week, experience for a skill week. */
  gainLabel: string;
}

export interface ClanEventsAdminData {
  events: AdminClanEvent[];
  nextSlot: NextClanEventSlot;
  picker: ClanEventPickerResult;
  /** Null when nothing is running. */
  running: RunningClanEvent | null;
  winCounts: { playerName: string; wins: number; isActiveMember: boolean }[];
  /**
   * Null when nobody has been rolled, or when the roll was for an earlier
   * slot — a name against last week's event is worse than no name, so a stale
   * assignment expires rather than lingering.
   */
  duty: ClanEventDutySummary | null;
}

/**
 * Everything the admin page's Events pane renders.
 *
 * The access check lives here as well as on the page, matching
 * `fetchAdminDashboard` — a caller must not be able to reach the event history
 * by importing around the page.
 */
export async function fetchClanEvents(): Promise<
  | { success: true; data: ClanEventsAdminData }
  | { success: false; error: string }
> {
  try {
    const session = await auth();
    const discordUserId = session?.user?.id;

    if (!discordUserId) {
      return { success: false, error: 'Not signed in' };
    }

    const { role } = await getStaffIdentityForDiscordUser(discordUserId);

    if (!canAccessAdminDashboard(role)) {
      return { success: false, error: 'Not an elevated account' };
    }

    const now = new Date();

    await syncClanEventResults(now);

    const [events, latest, winCounts, duty] = await Promise.all([
      getClanEvents(20),
      getLatestClanEvent(),
      getClanEventWinCounts(),
      getClanEventDuty(),
    ]);

    const type = nextClanEventType(latest?.type ?? null);
    const { startsAt, endsAt } = nextClanEventWindow(
      now,
      latest?.startsAt ?? null,
    );

    const queued = events.find(
      (event) => clanEventPhase(event, now) === 'upcoming',
    );

    /*
     * The running event's standings, but only when there is something blocking
     * creation — that is the only state the pane renders them in, and Temple is
     * a network call worth not making otherwise.
     */
    const activeEvent = events.find(
      (event) => clanEventPhase(event, now) === 'active',
    );

    const competition =
      queued && activeEvent
        ? await fetchTempleCompetition(activeEvent.id)
        : null;

    const leaderEntry = competition?.participants
      ?.filter(({ gained }) => gained > 0)
      .reduce<{
        username: string;
        gained: number;
      } | null>((best, entry) => (!best || entry.gained > best.gained ? entry : best), null);

    return {
      success: true,
      data: {
        events: events.map((event) => ({
          id: event.id,
          type: event.type,
          typeLabel: clanEventTypeLabels[event.type],
          name: event.name,
          metricName: event.metricName,
          icon: findClanEventMetric(event.type, event.metricId)?.icon ?? null,
          startsAt: event.startsAt.toISOString(),
          endsAt: event.endsAt.toISOString(),
          hasCompetitionKey: !!event.competitionKey,
          createdBy: event.createdByPlayerName,
          winner: event.winner,
        })),
        nextSlot: {
          type,
          typeLabel: clanEventTypeLabels[type],
          startsAt: startsAt.toISOString(),
          endsAt: endsAt.toISOString(),
          nameSuffix: clanEventTypeSuffix[type],
          blockedReason: queued
            ? `“${queued.name}” is already queued for ${queued.startsAt.toUTCString()}. Only one event can be scheduled ahead of the one running.`
            : null,
        },
        picker: selectClanEventPicker(events, type, now),
        running:
          queued && activeEvent
            ? {
                name: activeEvent.name,
                typeLabel: clanEventTypeLabels[activeEvent.type],
                endsAt: activeEvent.endsAt.toISOString(),
                leader: leaderEntry
                  ? {
                      playerName: leaderEntry.username.replaceAll('_', ' '),
                      gained: leaderEntry.gained,
                    }
                  : null,
                standingsUnavailable: !competition,
                gainLabel: clanEventGainLabel[activeEvent.type],
              }
            : null,
        winCounts,
        // Tied to the slot it was rolled for: once the calendar moves on, the
        // assignment is spent and the pane offers a fresh roll.
        duty:
          duty && duty.startsAt === startsAt.toISOString()
            ? {
                playerName: duty.playerName,
                rolledAt: duty.rolledAt.toISOString(),
                rolledByPlayerName: duty.rolledByPlayerName,
              }
            : null,
      },
    };
  } catch (error) {
    console.error('Failed to fetch clan events:', error);

    return { success: false, error: String(error) };
  }
}
