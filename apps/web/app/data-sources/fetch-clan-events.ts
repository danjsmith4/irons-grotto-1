import 'server-only';
import { auth } from '@/auth';
import {
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
import {
  clanEventPhase,
  nextClanEventWindow,
} from '@/app/utils/clan-event-schedule';
import { fetchTempleCompetition } from './fetch-temple-competition';
import { syncClanEventResults } from './sync-clan-event-results';

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
  winner: { playerName: string; gained: number } | null;
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

/** Who decides this event's skill or boss. */
export interface ClanEventPicker {
  playerName: string;
  /** 'winner' — a finished event they won. 'leading' — the event still running. */
  basis: 'winner' | 'leading';
  eventName: string;
}

export interface ClanEventsAdminData {
  events: AdminClanEvent[];
  nextSlot: NextClanEventSlot;
  picker: ClanEventPicker | null;
  winCounts: { playerName: string; wins: number }[];
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

    const [events, latest, winCounts] = await Promise.all([
      getClanEvents(20),
      getLatestClanEvent(),
      getClanEventWinCounts(),
    ]);

    const type = nextClanEventType(latest?.type ?? null);
    const { startsAt, endsAt } = nextClanEventWindow(
      now,
      latest?.startsAt ?? null,
    );

    const queued = events.find(
      (event) => clanEventPhase(event, now) === 'upcoming',
    );

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
        picker: await resolvePicker(events, now),
        winCounts,
      },
    };
  } catch (error) {
    console.error('Failed to fetch clan events:', error);

    return { success: false, error: String(error) };
  }
}

/**
 * Who the moderator should be asking for the skill or boss.
 *
 * The clan's rule is that the previous winner picks, so the answer is the
 * winner of the event immediately before the one being created. While an event
 * is still running that winner is not decided yet — so the current leader is
 * offered instead, clearly labelled as provisional, because that is the person
 * a moderator creating next week's event actually needs to talk to.
 */
async function resolvePicker(
  events: Awaited<ReturnType<typeof getClanEvents>>,
  now: Date,
): Promise<ClanEventPicker | null> {
  const running = events.find(
    (event) => clanEventPhase(event, now) === 'active',
  );

  if (running) {
    const competition = await fetchTempleCompetition(running.id);
    const [leader] = (competition?.participants ?? []).filter(
      ({ gained }) => gained > 0,
    );

    if (leader) {
      return {
        playerName: leader.username.replaceAll('_', ' '),
        basis: 'leading',
        eventName: running.name,
      };
    }
  }

  const lastWon = events.find(
    (event) => clanEventPhase(event, now) === 'finished' && event.winner,
  );

  return lastWon?.winner
    ? {
        playerName: lastWon.winner.playerName,
        basis: 'winner',
        eventName: lastWon.name,
      }
    : null;
}
