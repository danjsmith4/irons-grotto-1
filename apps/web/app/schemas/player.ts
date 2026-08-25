import { Rank } from '@/config/enums';
import { z } from 'zod';

export const PlayerName = z.string().max(12, 'Player name is too long');

export type PlayerName = z.infer<typeof PlayerName>;

/**
 * A date a player joined the clan, which cannot be in the future.
 *
 * ⚠️ **Deliberately a `refine`, not `z.date().max(new Date())`.** The `max`
 * form evaluates `new Date()` **once, when the module is first imported**, so
 * the ceiling is frozen at whatever time the server process started. Every
 * moment after that is "in the future" as far as the schema is concerned.
 *
 * That rejected signups outright: onboarding defaults the join date to *now*
 * when the clan member list has no record of someone, which is by definition
 * later than server start, and the player got a validation error quoting a
 * timestamp that meant nothing to them. A long-running server made it worse the
 * longer it stayed up. `Date.now()` inside the predicate is read per parse.
 */
export const JoinDate = z
  .date()
  .refine((date) => date.getTime() <= Date.now(), {
    message: 'Your join date cannot be in the future.',
  });

export const Player = z.object({
  isNameInvalid: z.literal(true).optional(),
  joinDate: z.date(),
  rank: Rank.optional(),
  rsn: PlayerName,
  isMobileOnly: z.boolean(),
});

export type Player = z.infer<typeof Player>;
