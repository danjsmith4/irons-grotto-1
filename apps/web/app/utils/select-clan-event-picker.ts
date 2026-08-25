import type { ClanEventType } from '@/config/clan-events';
import { clanEventPhase } from './clan-event-schedule';

/** The fields of an event this rule needs. */
export interface ClanEventPickerCandidate {
  type: ClanEventType;
  name: string;
  startsAt: Date;
  endsAt: Date;
  winner: {
    playerName: string;
    gained: number;
    /** False once they leave the clan — `players.is_active`. */
    isActiveMember: boolean;
  } | null;
}

export interface ClanEventPickerEntry {
  playerName: string;
  /** The event they won, so the pane can say why they are being named. */
  eventName: string;
  isActiveMember: boolean;
}

export interface ClanEventPickerResult {
  /**
   * The rule's answer: whoever won the last event of this type, in or out of
   * the clan. Null when no event of this type has a winner recorded.
   */
  winner: ClanEventPickerEntry | null;
  /**
   * The most recent winner of this type who is *still in the clan*, offered
   * only when `winner` has left. Null when the winner is still here — they are
   * the answer — or when no past winner of this type remains.
   */
  standIn: ClanEventPickerEntry | null;
}

/**
 * Who chooses the skill or boss for the next event.
 *
 * The clan's rule is that the last winner **of that same kind of event**
 * picks: a boss week's boss is chosen by whoever won the previous boss week,
 * not by whoever won last week. The distinction matters because the two types
 * alternate — so the event running right now is always the *other* type, and
 * its leader is never the person to ask.
 *
 * Members leave, and a departed winner cannot pick anything. Rather than
 * silently skipping them — which would quietly rewrite who the rule points at
 * — both are returned: the winner the rule actually names, and the most recent
 * winner still in the clan to ask instead. The pane says both out loud, so a
 * moderator can see why they are being sent to the second name.
 *
 * Only finished events count. A running event has no winner yet, and the type
 * being created is never the type running, so there is nothing provisional to
 * offer here.
 */
export function selectClanEventPicker(
  events: ClanEventPickerCandidate[],
  nextType: ClanEventType,
  now: Date,
): ClanEventPickerResult {
  // flatMap rather than filter + assertion: it narrows `winner` away from null
  // as it maps, so nothing downstream has to claim knowledge the type lacks.
  const won: ClanEventPickerEntry[] = [...events]
    .sort((a, b) => b.startsAt.getTime() - a.startsAt.getTime())
    .flatMap((event) =>
      event.type === nextType &&
      clanEventPhase(event, now) === 'finished' &&
      event.winner
        ? [
            {
              playerName: event.winner.playerName,
              eventName: event.name,
              isActiveMember: event.winner.isActiveMember,
            },
          ]
        : [],
    );

  const [winner] = won;

  if (!winner) {
    return { winner: null, standIn: null };
  }

  if (winner.isActiveMember) {
    return { winner, standIn: null };
  }

  return {
    winner,
    standIn: won.find((entry) => entry.isActiveMember) ?? null,
  };
}
