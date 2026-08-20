import { PlayerName } from '@/app/schemas/player';
import { AccountTypeChoice } from '@/app/schemas/staff';
import { z } from 'zod';
import { validatePlayerExists } from '../../validation/player-validation';

export const AddPlayerSchema = z.object({
  playerName: PlayerName.refine(validatePlayerExists, 'Invalid player name'),
  joinDate: z.date().max(new Date()),
  isMobileOnly: z.boolean().optional().default(false),
  // Only asked for — and only sent — when TempleOSRS cannot resolve the
  // account's game mode by itself.
  accountType: AccountTypeChoice.optional(),
  gimGroupName: z.string().max(12).optional(),
});

export type AddPlayerSchema = z.infer<typeof AddPlayerSchema>;
