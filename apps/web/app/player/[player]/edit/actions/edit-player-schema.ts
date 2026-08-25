import { JoinDate, PlayerName } from '@/app/schemas/player';
import { z } from 'zod';
import { validatePlayerExists } from '../../../validation/player-validation';

export const EditPlayerSchema = z.object({
  playerName: PlayerName.refine(validatePlayerExists, 'Invalid player name'),
  joinDate: JoinDate,
  isMobileOnly: z.boolean().optional().default(false),
});

export type EditPlayerSchema = z.infer<typeof EditPlayerSchema>;
