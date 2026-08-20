import 'server-only';
import * as Sentry from '@sentry/nextjs';
import { DiscordAPIError } from '@discordjs/rest';
import {
  APIGuildMember,
  RESTJSONErrorCodes,
  Routes,
} from 'discord-api-types/v10';
import { serverConstants } from '@/config/constants.server';
import { discordBotClient } from '@/discord';
import type { StaffRole } from '@/app/schemas/staff';
import { planStaffDiscordRoleChange } from './plan-staff-discord-role-change';

export type StaffDiscordSyncResult =
  | { status: 'synced' }
  | { status: 'not-in-server' }
  | { status: 'failed'; error: string };

/**
 * Carries out `planStaffDiscordRoleChange` against the guild.
 *
 * The bot can touch these roles because its highest role (`Robots`) sits above
 * all four, and its own role carries MANAGE_ROLES. Move either of those below
 * Owner in the server settings and every call here starts failing with 50013.
 */
export async function syncStaffDiscordRole(
  discordUserId: string,
  role: StaffRole | null,
): Promise<StaffDiscordSyncResult> {
  const { guildId } = serverConstants.discord;

  try {
    const { roles } = (await discordBotClient.get(
      Routes.guildMember(guildId, discordUserId),
    )) as APIGuildMember;

    const { remove, add } = planStaffDiscordRoleChange(roles, role);

    // Discord has no bulk role-removal endpoint, so these are one call each.
    // Sequential rather than parallel: it is at most three, and the guild
    // member is being mutated by every one of them.
    for (const roleId of remove) {
      await discordBotClient.delete(
        Routes.guildMemberRole(guildId, discordUserId, roleId),
      );
    }

    if (add) {
      await discordBotClient.put(
        Routes.guildMemberRole(guildId, discordUserId, add),
      );
    }

    return { status: 'synced' };
  } catch (error) {
    // Someone can hold a clan rank here and no longer be in the Discord. That
    // is not a failure worth alarming about — there is simply nothing to sync.
    if (
      error instanceof DiscordAPIError &&
      error.code === RESTJSONErrorCodes.UnknownMember
    ) {
      return { status: 'not-in-server' };
    }

    console.error(
      `Failed to sync Discord staff role for ${discordUserId}:`,
      error,
    );

    Sentry.captureException(error, {
      tags: { area: 'staff-roles' },
      extra: { discordUserId, role },
    });

    return { status: 'failed', error: String(error) };
  }
}
