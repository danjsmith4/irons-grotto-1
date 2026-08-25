'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { authActionClient } from '@/app/safe-action';
import { ActionError } from '@/app/action-error';
import { unbanGuildUser } from '../utils/discord-bans';
import { authorizeDiscordBan } from '../utils/authorize-discord-ban';
import {
  buildBanAuditReason,
  DISCORD_SNOWFLAKE_PATTERN,
} from '../utils/discord-user-identity';

const UnbanDiscordMemberSchema = z.object({
  discordUserId: z
    .string()
    .trim()
    .regex(DISCORD_SNOWFLAKE_PATTERN, 'That is not a Discord user id'),
});

/**
 * Lifts a ban, letting the account back into the server if it asks.
 *
 * Held to the same outranking rule as placing one. Lifting a ban is not the
 * harmless direction — a moderator quietly readmitting someone an owner
 * removed is exactly what the ladder is there to prevent.
 */
export const unbanDiscordMemberAction = authActionClient
  .metadata({ actionName: 'unban-discord-member' })
  .schema(UnbanDiscordMemberSchema)
  .action(async ({ parsedInput: { discordUserId }, ctx: { userId } }) => {
    const { actorName } = await authorizeDiscordBan(userId, discordUserId);

    const result = await unbanGuildUser(
      discordUserId,
      buildBanAuditReason('Ban lifted', actorName),
    );

    // The ban list this was clicked from is a snapshot. If it has since been
    // lifted elsewhere the outcome is the one that was wanted, so say so and
    // let the refresh below correct the page.
    if (result.status === 'not-banned' || result.status === 'unknown-user') {
      revalidatePath('/admin');

      return { discordUserId, alreadyLifted: true };
    }

    if (result.status === 'missing-permission') {
      throw new ActionError(
        'The bot cannot lift that ban. It needs the Ban Members permission in Discord.',
      );
    }

    if (result.status !== 'done') {
      throw new ActionError('Discord could not be reached. Try again shortly.');
    }

    revalidatePath('/admin');

    return { discordUserId, alreadyLifted: false };
  });
