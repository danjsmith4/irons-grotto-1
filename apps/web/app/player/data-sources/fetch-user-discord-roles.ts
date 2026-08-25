import { serverConstants } from '@/config/constants.server';
import { discordBotClient } from '@/discord';
import { DiscordAPIError, HTTPError, RateLimitError } from '@discordjs/rest';
import {
  APIGuildMember,
  RESTJSONErrorCodes,
  Routes,
} from 'discord-api-types/v10';
import * as Sentry from '@sentry/nextjs';

/**
 * Three genuinely different outcomes, which callers must not collapse:
 *
 * - `ok`            — we know the member's roles.
 * - `not-a-member`  — Discord is certain this user is not in the guild
 *                     (left / kicked / banned, or a stale `discordUserId`).
 *                     They really have lost their role-derived bonuses.
 * - `unavailable`   — we could not find out (rate limit, outage, network).
 *                     Says nothing about the member; callers must preserve
 *                     whatever they already have rather than assume zero.
 */
export type DiscordRolesResult =
  | { status: 'ok'; roles: Set<string> }
  | { status: 'not-a-member' }
  | { status: 'unavailable'; error: unknown };

/**
 * `@discordjs/rest` waits out 429s itself (`rejectOnRateLimit: null`) and
 * retries 5xx/aborts (`retries: 3`), so rate limits are absorbed before they
 * reach us. A `RateLimitError` only surfaces if that behaviour is ever
 * reconfigured — classify it as transient rather than silently zeroing points.
 */
function isTransient(error: unknown) {
  if (error instanceof RateLimitError || error instanceof HTTPError) {
    return true;
  }

  if (error instanceof DiscordAPIError) {
    return error.status === 429 || error.status >= 500;
  }

  // Network-level failures (fetch throws a TypeError) are transient too.
  return true;
}

export async function fetchUserDiscordRoles(
  userId: string,
): Promise<DiscordRolesResult> {
  const {
    discord: { guildId },
  } = serverConstants;

  try {
    const { roles } = (await discordBotClient.get(
      Routes.guildMember(guildId, userId),
    )) as APIGuildMember;

    return { status: 'ok', roles: new Set(roles) };
  } catch (error) {
    if (
      error instanceof DiscordAPIError &&
      error.code === RESTJSONErrorCodes.UnknownMember
    ) {
      // Expected, not exceptional — don't page Sentry for someone leaving.
      console.warn(
        `Discord user ${userId} is not a member of guild ${guildId}`,
      );

      return { status: 'not-a-member' };
    }

    if (isTransient(error)) {
      console.warn(
        `Temporarily unable to fetch discord roles for user: ${userId}`,
        error,
      );

      return { status: 'unavailable', error };
    }

    console.error(
      `Error while fetching discord roles for user: ${userId}`,
      error,
    );
    Sentry.captureException(error);

    return { status: 'unavailable', error };
  }
}
