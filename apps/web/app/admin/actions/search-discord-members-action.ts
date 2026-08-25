'use server';

import { z } from 'zod';
import { DiscordAPIError } from '@discordjs/rest';
import { RESTJSONErrorCodes } from 'discord-api-types/v10';
import { authActionClient } from '@/app/safe-action';
import { ActionError } from '@/app/action-error';
import {
  getClanIdentitiesForDiscordUsers,
  getStaffIdentityForDiscordUser,
} from '@/lib/db/staff-operations';
import {
  canAccessAdminDashboard,
  canManageDiscordBan,
} from '@/app/utils/staff-permissions';
import { searchGuildUsers } from '../utils/discord-bans';

const SearchDiscordMembersSchema = z.object({
  query: z.string().trim().min(2).max(64),
});

export interface DiscordMemberSearchResult {
  id: string;
  displayName: string;
  handle: string;
  isInServer: boolean;
  playerNames: string[];
  canManage: boolean;
}

/**
 * Finds accounts to ban, by Discord name or by pasted user id.
 *
 * Read-only, but gated all the same — the guild's member list is not something
 * a signed-in member gets to enumerate by reaching for this action directly.
 * Every result carries whether the caller may actually ban it, so the pane can
 * say why a button is missing instead of failing on click.
 */
export const searchDiscordMembersAction = authActionClient
  .metadata({ actionName: 'search-discord-members' })
  .schema(SearchDiscordMembersSchema)
  .action(async ({ parsedInput: { query }, ctx: { userId } }) => {
    const { role: actorRole } = await getStaffIdentityForDiscordUser(userId);

    if (!canAccessAdminDashboard(actorRole)) {
      throw new ActionError('You do not have access to the admin dashboard');
    }

    let found;

    try {
      found = await searchGuildUsers(query);
    } catch (error) {
      // Searching members by name needs the Server Members intent switched on
      // for the bot, and Discord refuses the call as plain missing access when
      // it is not. Naming the intent is far more useful than "search failed",
      // because it is a checkbox in the Discord developer portal.
      if (
        error instanceof DiscordAPIError &&
        (error.code === RESTJSONErrorCodes.MissingAccess ||
          error.code === RESTJSONErrorCodes.MissingPermissions)
      ) {
        throw new ActionError(
          'The bot cannot search members. Enable its Server Members intent in Discord, or paste a user id instead.',
        );
      }

      console.error('Discord member search failed:', error);

      throw new ActionError('Discord could not be reached. Try again shortly.');
    }

    const identities = await getClanIdentitiesForDiscordUsers(
      found.map((user) => user.id),
    );

    return {
      query,
      results: found.map<DiscordMemberSearchResult>((user) => {
        const identity = identities.get(user.id);

        return {
          ...user,
          playerNames: identity?.playerNames ?? [],
          canManage: canManageDiscordBan({
            actorRole,
            targetRole: identity?.staffRole ?? null,
            isSelf: user.id === userId,
          }),
        };
      }),
    };
  });
