import { z } from 'zod';
import type { ClanEventType } from '@/config/clan-events';

/**
 * Temple reports its competition dates as `YYYY-MM-DD HH:MM:SS`, with no zone
 * marker, and its server time is UTC. `new Date(string)` on that form is
 * implementation-defined and V8 reads it as *local* time, which quietly shifts
 * every event by the host's offset — so it is normalised here rather than
 * anywhere a Date is convenient.
 */
export function parseTempleUtcDate(value: string): Date {
  return new Date(`${value.replace(' ', 'T')}Z`);
}

const TempleDate = z.string().transform(parseTempleUtcDate);

/**
 * A row of `competition_info.php`'s standings.
 *
 * `xp_gained` is Temple's name for it whichever metric the competition tracks
 * — for a boss week it is kill count. Renamed to `gained` here so nothing
 * downstream has to pretend a Vorkath kc is experience.
 */
export const TempleCompetitionParticipant = z
  .object({
    username: z.string(),
    xp_gained: z.coerce.number(),
    start_level: z.coerce.number().optional(),
    current_level: z.coerce.number().optional(),
  })
  .transform(({ username, xp_gained: gained, ...rest }) => ({
    username,
    gained,
    startLevel: rest.start_level ?? null,
    currentLevel: rest.current_level ?? null,
  }));

export type TempleCompetitionParticipant = z.infer<
  typeof TempleCompetitionParticipant
>;

export const TempleCompetitionResponse = z.object({
  data: z.object({
    info: z.object({
      id: z.coerce.number().int(),
      name: z.string(),
      skill: z.string(),
      skill_index: z.coerce.number().int(),
      participant_count: z.coerce.number().int(),
      start_date: TempleDate,
      end_date: TempleDate,
      status_text: z.string(),
      linked_group_id: z.coerce.number().int().nullable().optional(),
    }),
    participants: z.array(TempleCompetitionParticipant),
  }),
});

export type TempleCompetitionResponse = z.infer<
  typeof TempleCompetitionResponse
>;

/**
 * `competition_create.php`'s reply.
 *
 * Loosely parsed on purpose. The published attribute table has two rows called
 * `name` (one of them is plainly the id) and does not say whether the payload
 * is wrapped in `data`, so both shapes are accepted and everything beyond the
 * three fields we actually store is passed through. `key` is the one field
 * Temple never returns twice — it is the competition's edit password — so a
 * reply that parses without it is still a successful creation, just one we can
 * no longer edit.
 */
const TempleCompetitionCreateBody = z
  .object({
    id: z.coerce.number().int(),
    name: z.string().optional(),
    key: z.string().optional(),
    skill: z.union([z.string(), z.number()]).optional(),
    'skill-name': z.string().optional(),
    'start-date-unix': z.coerce.number().int().optional(),
    'end-date-unix': z.coerce.number().int().optional(),
  })
  .passthrough();

export const TempleCompetitionCreateResponse = z.union([
  z.object({ data: TempleCompetitionCreateBody }).transform(({ data }) => data),
  TempleCompetitionCreateBody,
]);

export type TempleCompetitionCreateResponse = z.infer<
  typeof TempleCompetitionCreateResponse
>;

/** Temple's error envelope, which comes back with a 200. */
export const TempleErrorResponse = z.object({
  error: z.object({
    Code: z.coerce.number().int(),
    Message: z.string(),
  }),
});

/** A stored event, as every consumer of it sees it. */
export interface ClanEvent {
  /** TempleOSRS's competition id — see `lib/db/schema.ts`. */
  id: number;
  type: ClanEventType;
  name: string;
  metricId: number;
  metricName: string;
  startsAt: Date;
  endsAt: Date;
}
