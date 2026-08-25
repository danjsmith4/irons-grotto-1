import {
  clanEventTypeLabels,
  clanEventTypeSuffix,
  type ClanEventType,
} from '@/config/clan-events';
import type { ClanEventPickerResult } from './select-clan-event-picker';

export interface EventDutyMessageInput {
  discordUserId: string;
  type: ClanEventType;
  /** When the event must be live — the Friday 14:00 UTC slot. */
  startsAt: Date;
  /** Who chooses the skill or boss, with the departed-member case intact. */
  picker: ClanEventPickerResult;
  /** Absolute link to the admin dashboard. */
  adminUrl: string;
  now?: Date;
}

const dutyDeadline = new Intl.DateTimeFormat('en-GB', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'UTC',
  hour12: false,
});

/** "3 days", "7 hours", "40 minutes" — how long they have, roughly. */
function formatRemaining(startsAt: Date, now: Date): string {
  const minutes = Math.round((startsAt.getTime() - now.getTime()) / 60_000);

  if (minutes <= 0) {
    return 'it was due already';
  }

  if (minutes < 90) {
    return `${minutes} minutes`;
  }

  const hours = Math.round(minutes / 60);

  if (hours < 36) {
    return `${hours} hours`;
  }

  return `${Math.round(hours / 24)} days`;
}

/**
 * The message that lands in the clan chat when someone is rolled onto duty.
 *
 * Pure and spec'd, because it is the one thing here that gets read by the
 * whole clan and it carries real information: what the event is, when it has
 * to be live, and who to ask for the pick — including when that person has
 * left, which is otherwise a five-minute dead end for whoever is on duty.
 *
 * The jokes are load-bearing only in the sense that nobody reads a rota
 * notice twice. The facts come first on their own lines so they survive being
 * skimmed.
 */
export function buildEventDutyMessage({
  discordUserId,
  type,
  startsAt,
  picker,
  adminUrl,
  now = new Date(),
}: EventDutyMessageInput): string {
  const label = clanEventTypeLabels[type];
  const noun = type === 'sotw' ? 'skill' : 'boss';
  const remaining = formatRemaining(startsAt, now);

  const lines = [
    `🎲 <@${discordUserId}> — the wheel has spoken, and it has chosen violence.`,
    '',
    `You're on **${label}** duty. Here is everything you need, so there is no excuse:`,
    '',
    `**Event** — the next one is a ${label} (${clanEventTypeSuffix[type]}). Not negotiable, they alternate.`,
    `**Live by** — ${dutyDeadline.format(startsAt)} UTC. That is about ${remaining} away.`,
  ];

  if (!picker.winner) {
    lines.push(
      `**The pick** — no past ${label} winner is on record, so round up staff and argue about it like adults.`,
    );
  } else if (picker.winner.isActiveMember) {
    lines.push(
      `**The pick** — ask **${picker.winner.playerName}**, who won the last ${label} (“${picker.winner.eventName}”). They choose the ${noun}.`,
    );
  } else if (picker.standIn) {
    lines.push(
      `**The pick** — **${picker.winner.playerName}** won the last ${label} (“${picker.winner.eventName}”) and then left the clan, which is one way to dodge the responsibility. Ask **${picker.standIn.playerName}** instead — they won “${picker.standIn.eventName}”.`,
    );
  } else {
    lines.push(
      `**The pick** — **${picker.winner.playerName}** won the last ${label} (“${picker.winner.eventName}”) and has since left the clan, and nobody else who has won one is still here. Staff choice it is.`,
    );
  }

  lines.push(
    `**Where** — ${adminUrl} → Events. Pick the ${noun}, press the button, done in thirty seconds.`,
    '',
    'Chop chop. ⏰',
  );

  return lines.join('\n');
}
