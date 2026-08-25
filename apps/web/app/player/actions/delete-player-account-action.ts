'use server';

import { revalidatePath } from 'next/cache';
import { authActionClient } from '@/app/safe-action';
import { z } from 'zod';
import { deletePlayer } from '@/lib/db/player-operations';

export const deletePlayerAccountAction = authActionClient
  .metadata({ actionName: 'delete-player-account' })
  .schema(z.string())
  .action(async ({ parsedInput: playerName, ctx: { userId } }) => {
    await deletePlayer(playerName, userId);

    revalidatePath('/dashboard');
  });
