'use server';

import { z } from 'zod';
import { authActionClient } from '@/app/safe-action';
import { PlayerName } from '@/app/schemas/player';
import { validatePlayerExists } from '@/app/player/validation/player-validation';
import type { HiscoresScan } from '../scan-types';

/**
 * Does Jagex know this name?
 *
 * The cheapest question in the scan and the only one that can fail the whole
 * thing, so it goes first. `validatePlayerExists` answers *true* when the
 * hiscores are unreachable — an outage is not evidence that a player does not
 * exist, and refusing a real member their account over it would be worse than
 * letting a typo through to a screen full of blanks.
 */
export const scanHiscoresAction = authActionClient
  .metadata({ actionName: 'join-scan-hiscores' })
  .schema(z.object({ playerName: PlayerName }))
  .action(async ({ parsedInput: { playerName } }): Promise<HiscoresScan> => ({
    exists: await validatePlayerExists(playerName),
  }));
