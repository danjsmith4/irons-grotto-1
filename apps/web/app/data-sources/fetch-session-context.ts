import 'server-only';
import { after } from 'next/server';
import { auth } from '@/auth';
import { Rank } from '@/config/enums';
import { clanEventTypeLabels, findClanEventMetric } from '@/config/clan-events';
import type { StaffRole } from '@/app/schemas/staff';
import { staffRoleOrder } from '@/app/utils/staff-permissions';
import { getPlayersByDiscordId } from '@/lib/db/player-operations';
import { getCurrentAndNextClanEvents } from '@/lib/db/clan-event-operations';
import type { ClanEventRow } from '@/lib/db/schema';
import type { ClanEventSummary } from './fetch-clan-event-status';
import { syncClanEventResults } from './sync-clan-event-results';

/** One of the viewer's own accounts, in the shape the nav bar reads. */
export interface SessionAccount {
  rsn: string;
  rank?: Rank;
  joinDate: Date;
  isMobileOnly: boolean;
  totalLevel: number;
  isNameInvalid?: true;
}

/** Which event is running and which is queued. Summaries only — no standings. */
export interface SessionEvents {
  active: ClanEventSummary | null;
  next: ClanEventSummary | null;
}

export interface SessionContext {
  /** Highest staff role across the viewer's active accounts. */
  staffRole: StaffRole | null;
  /** Keyed by lower-cased name, as every consumer already expects. */
  accounts: Record<string, SessionAccount>;
  events: SessionEvents;
}

/**
 * Everything the app knows about *who is looking at it*, in one place.
 *
 * This is the identity bundle: the viewer's accounts, whether they are staff,
 * and what event is on. It is deliberately not the player sheet — the rank
 * calculator loads far more, per player, and belongs in its own path.
 *
 * ⚠️ **Two queries, not four.** The staff role is derived from the accounts
 * rows rather than asked for separately: `players` carries `staff_role`, so
 * fetching the viewer's players already answers it. The running and queued
 * events are one query for the same reason (`getCurrentAndNextClanEvents`).
 * The two that remain are independent, so they go out together and cost the
 * slower of the pair.
 *
 * ⚠️ **Nothing here touches TempleOSRS.** Which event is on is ours and comes
 * from our database; only the *standings* need Temple, and those are fetched by
 * the client once the indicator is already on screen. A page render must never
 * wait on a third party to draw its own nav bar.
 *
 * ⚠️ **It never throws.** This decorates every page in the app, so a fault in
 * it degrades the chrome rather than taking down the page.
 */
export async function fetchSessionContext(): Promise<SessionContext> {
  const empty: SessionContext = {
    staffRole: null,
    accounts: {},
    events: { active: null, next: null },
  };

  try {
    const session = await auth();
    const discordUserId = session?.user?.id;
    const now = new Date();

    /*
     * Recording finished events rides page loads rather than a cron, so it has
     * to keep happening now that the nav no longer calls the status endpoint.
     * `after` runs it once the response is sent, so it costs the viewer
     * nothing — the same treatment the homepage gives the inactivity sync.
     */
    after(() => syncClanEventResults(now));

    const [accountRows, events] = await Promise.all([
      discordUserId ? getPlayersByDiscordId(discordUserId) : [],
      getCurrentAndNextClanEvents(now),
    ]);

    return {
      staffRole: highestStaffRole(accountRows),
      accounts: Object.fromEntries(
        accountRows.map((player) => [
          player.playerName.toLowerCase(),
          {
            rsn: player.playerName,
            rank: player.rank as Rank,
            joinDate: new Date(player.joinDate),
            isMobileOnly: player.isMobileOnly,
            totalLevel: player.totalLevel,
          },
        ]),
      ),
      events: {
        active: events.active ? toSummary(events.active) : null,
        next: events.next ? toSummary(events.next) : null,
      },
    };
  } catch (error) {
    console.error('Failed to fetch session context:', error);

    return empty;
  }
}

/**
 * The highest role held on an **active** account.
 *
 * Matches `getStaffIdentityForDiscordUser` exactly, which is the point: this
 * replaces that call on the nav path, so it must not answer differently. A
 * member's soft-deleted account does not carry standing.
 */
function highestStaffRole(
  accounts: { staffRole: StaffRole | null; isActive: boolean }[],
): StaffRole | null {
  return accounts.reduce<StaffRole | null>((highest, account) => {
    if (!account.isActive || !account.staffRole) {
      return highest;
    }

    return !highest ||
      staffRoleOrder[account.staffRole] > staffRoleOrder[highest]
      ? account.staffRole
      : highest;
  }, null);
}

function toSummary(event: ClanEventRow): ClanEventSummary {
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
