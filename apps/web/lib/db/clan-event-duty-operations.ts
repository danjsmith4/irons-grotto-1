import 'server-only';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { clanEventTypes } from '@/config/clan-events';
import { db } from './index';
import { syncMetadata } from './schema';

/**
 * Who is currently on the hook for setting the next event up.
 *
 * One row, in `sync_metadata` — this is singleton bookkeeping, which is what
 * that table is for, and it needs no queries of its own beyond "who is it".
 * The payload lives in the nullable `value` column as JSON.
 */
const dutyKey = 'clan-event-duty';

const StoredDuty = z.object({
  playerName: z.string(),
  discordUserId: z.string(),
  eventType: z.enum(clanEventTypes),
  /** The slot they were rolled for, so a stale assignment can be spotted. */
  startsAt: z.string(),
  rolledByPlayerName: z.string().nullable(),
});

export interface ClanEventDuty extends z.infer<typeof StoredDuty> {
  rolledAt: Date;
}

/**
 * Never throws.
 *
 * Whose turn it is is the least important thing the Events pane renders, and
 * `fetchClanEvents` turns any exception into a pane that shows nothing but an
 * error — so a duty record that cannot be read (unparseable payload, or the
 * `value` column not yet added on a deploy that landed ahead of migration
 * `0025`) reads as "nobody on duty" rather than taking the whole pane down
 * with it. The roll is cheap to repeat; creating an event is not.
 */
export async function getClanEventDuty(): Promise<ClanEventDuty | null> {
  try {
    const [row] = await db
      .select()
      .from(syncMetadata)
      .where(eq(syncMetadata.id, dutyKey))
      .limit(1);

    if (!row?.value) {
      return null;
    }

    return {
      ...StoredDuty.parse(JSON.parse(row.value)),
      rolledAt: row.lastRunAt,
    };
  } catch (error) {
    console.error('Could not read the clan event duty record:', error);

    return null;
  }
}

export async function setClanEventDuty(
  duty: Omit<ClanEventDuty, 'rolledAt'>,
): Promise<void> {
  const rolledAt = new Date();

  await db
    .insert(syncMetadata)
    .values({ id: dutyKey, lastRunAt: rolledAt, value: JSON.stringify(duty) })
    .onConflictDoUpdate({
      target: syncMetadata.id,
      set: { lastRunAt: rolledAt, value: JSON.stringify(duty) },
    });
}
