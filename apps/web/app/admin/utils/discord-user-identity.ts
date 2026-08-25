import type { APIUser } from 'discord-api-types/v10';

/**
 * How a Discord account is shown in the ban panes: the name a moderator would
 * recognise, plus the handle that identifies it unambiguously.
 */
export interface DiscordUserIdentity {
  id: string;
  /** Server nickname, then display name, then the raw username. */
  displayName: string;
  /** The `@handle` — or `name#0001` on a legacy, un-migrated account. */
  handle: string;
}

/** Discord's sentinel for an account migrated to the `@handle` system. */
const LEGACY_DISCRIMINATOR = '0';

/**
 * A user id as Discord issues them. Snowflakes are 64-bit, so they arrive as
 * strings of 17–20 digits — anything else was typed by hand and is not one.
 */
export const DISCORD_SNOWFLAKE_PATTERN = /^\d{17,20}$/;

export function isDiscordSnowflake(value: string) {
  return DISCORD_SNOWFLAKE_PATTERN.test(value.trim());
}

/**
 * Names a Discord account for display.
 *
 * Three fields can carry a name and they are not interchangeable: `nick` is
 * what this server calls them, `global_name` is what they call themselves, and
 * `username` is the only one guaranteed to exist. A moderator looking at a ban
 * list wants the first one they would recognise, so they are tried in that
 * order.
 */
export function describeDiscordUser(
  user: APIUser,
  nickname?: string | null,
): DiscordUserIdentity {
  const isLegacyAccount =
    Boolean(user.discriminator) && user.discriminator !== LEGACY_DISCRIMINATOR;

  // A blank nickname has to fall through like a missing one — Discord returns
  // an empty string for a nickname that was set and then cleared.
  const displayName =
    [nickname, user.global_name].find((name) => name?.trim()) ?? user.username;

  return {
    id: user.id,
    displayName,
    handle: isLegacyAccount
      ? `${user.username}#${user.discriminator}`
      : `@${user.username}`,
  };
}

/** Discord rejects an audit-log reason longer than this. */
const AUDIT_LOG_REASON_LIMIT = 512;

/**
 * The reason recorded against the ban, in Discord.
 *
 * There is no `discord_bans` table and there does not need to be one: Discord
 * stores the reason on the ban itself and hands it back with the ban list, so
 * writing the actor into it makes the list its own audit trail — and puts the
 * same line in the server's audit log, where the bot would otherwise be the
 * only actor recorded.
 */
export function buildBanAuditReason(
  reason: string | null | undefined,
  actorName: string,
): string {
  const trimmed = reason?.trim();
  const attribution = `(by ${actorName} via the Grotto admin page)`;
  const full = trimmed
    ? `${trimmed} ${attribution}`
    : `No reason given ${attribution}`;

  return full.slice(0, AUDIT_LOG_REASON_LIMIT);
}
