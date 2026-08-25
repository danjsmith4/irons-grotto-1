'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { authActionClient } from '@/app/safe-action';
import { ActionError } from '@/app/action-error';
import { banGuildUser } from '../utils/discord-bans';
import { authorizeDiscordBan } from '../utils/authorize-discord-ban';
import {
  buildBanAuditReason,
  DISCORD_SNOWFLAKE_PATTERN,
} from '../utils/discord-user-identity';

const BanDiscordMemberSchema = z.object({
  discordUserId: z
    .string()
    .trim()
    .regex(DISCORD_SNOWFLAKE_PATTERN, 'That is not a Discord user id'),
  /** Optional, but it is the only record of why — the UI asks for it. */
  reason: z.string().trim().max(300).optional(),
});

/**
 * Bans an account from the clan Discord.
 *
 * This changes nothing here: the member keeps their rank, their points and
 * their calculator. It removes them from the server and stops them rejoining,
 * which is a Discord concern and stays one.
 */
export const banDiscordMemberAction = authActionClient
  .metadata({ actionName: 'ban-discord-member' })
  .schema(BanDiscordMemberSchema)
  .action(
    async ({ parsedInput: { discordUserId, reason }, ctx: { userId } }) => {
      const { actorName } = await authorizeDiscordBan(userId, discordUserId);

      const result = await banGuildUser(
        discordUserId,
        buildBanAuditReason(reason, actorName),
      );

      if (result.status === 'unknown-user') {
        throw new ActionError('Discord does not know that account.');
      }

      if (result.status === 'missing-permission') {
        throw new ActionError(
          'The bot cannot ban that account. It needs the Ban Members permission, and its role must sit above theirs.',
        );
      }

      if (result.status !== 'done') {
        throw new ActionError('Discord could not be reached. Try again shortly.');
      }

      revalidatePath('/admin');

      return { discordUserId };
    },
  );
