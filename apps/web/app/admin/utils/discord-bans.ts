import 'server-only';
import * as Sentry from '@sentry/nextjs';
import { DiscordAPIError } from '@discordjs/rest';
import {
  APIBan,
  APIGuildMember,
  APIUser,
  RESTJSONErrorCodes,
  Routes,
} from 'discord-api-types/v10';
import { serverConstants } from '@/config/constants.server';
import { discordBotClient } from '@/discord';
import {
  describeDiscordUser,
  isDiscordSnowflake,
  type DiscordUserIdentity,
} from './discord-user-identity';

/** A ban as Discord holds it, named for display. */
export interface GuildBan extends DiscordUserIdentity {
  /** Whatever was recorded when the ban was placed, if anything. */
  reason: string | null;
}

/** A candidate the search pane offers up. */
export interface GuildUserSearchResult extends DiscordUserIdentity {
  /**
   * False when the account was found by id but is not in the server. Discord
   * allows banning them anyway, which is how someone is kept out pre-emptively.
   */
  isInServer: boolean;
}

export type DiscordBanActionResult =
  | { status: 'done' }
  | { status: 'not-banned' }
  | { status: 'missing-permission' }
  | { status: 'unknown-user' }
  | { status: 'failed'; error: string };

/** Discord's maximum page size for the ban list. */
const BAN_PAGE_SIZE = 1000;

/**
 * A stop on the pagination loop. Ten pages is ten thousand bans — far past
 * anything a clan server will hold, so hitting it means the cursor is not
 * advancing, and looping forever against Discord is the worse failure.
 */
const MAX_BAN_PAGES = 10;

const SEARCH_RESULT_LIMIT = 10;

function reportDiscordFailure(error: unknown, extra: Record<string, unknown>) {
  console.error('Discord ban operation failed:', error);

  Sentry.captureException(error, {
    tags: { area: 'discord-bans' },
    extra,
  });
}

/**
 * Every account banned from the guild.
 *
 * Discord pages this endpoint by user id rather than by offset, so each page
 * asks for what follows the last id seen. The list comes back sorted by id,
 * which is not the order anyone banned them in — the panel sorts for display.
 */
export async function listGuildBans(): Promise<GuildBan[]> {
  const { guildId } = serverConstants.discord;
  const bans: GuildBan[] = [];
  let after: string | undefined;

  for (let page = 0; page < MAX_BAN_PAGES; page += 1) {
    const query = new URLSearchParams({ limit: String(BAN_PAGE_SIZE) });

    if (after) {
      query.set('after', after);
    }

    // Sequential by necessity: each page is addressed by the last id of the
    // one before it.
    const batch = (await discordBotClient.get(Routes.guildBans(guildId), {
      query,
    })) as APIBan[];

    bans.push(
      ...batch.map((ban) => ({
        ...describeDiscordUser(ban.user),
        reason: ban.reason,
      })),
    );

    if (batch.length < BAN_PAGE_SIZE) {
      break;
    }

    after = batch[batch.length - 1]?.user.id;

    if (!after) {
      break;
    }
  }

  return bans;
}

/**
 * Looks up one account by id, whether or not it is in the server.
 *
 * Tried before the member search because a pasted id is an exact answer, and
 * because it is the only way to reach someone who has already left — the
 * member search can only see people who are still here.
 */
async function findDiscordUserById(
  id: string,
): Promise<GuildUserSearchResult | null> {
  const { guildId } = serverConstants.discord;

  try {
    const member = (await discordBotClient.get(
      Routes.guildMember(guildId, id),
    )) as APIGuildMember;

    return {
      ...describeDiscordUser(member.user, member.nick),
      isInServer: true,
    };
  } catch (error) {
    if (
      !(error instanceof DiscordAPIError) ||
      error.code !== RESTJSONErrorCodes.UnknownMember
    ) {
      throw error;
    }
  }

  try {
    const user = (await discordBotClient.get(Routes.user(id))) as APIUser;

    return { ...describeDiscordUser(user), isInServer: false };
  } catch (error) {
    if (
      error instanceof DiscordAPIError &&
      error.code === RESTJSONErrorCodes.UnknownUser
    ) {
      return null;
    }

    throw error;
  }
}

/**
 * Finds accounts to ban, by name or by id.
 *
 * The name search only covers people currently in the server, which is the
 * right default — the pane exists to remove someone who is here. Pasting an id
 * additionally reaches accounts that have already left, so a known bad actor
 * can be locked out before they rejoin.
 */
export async function searchGuildUsers(
  query: string,
): Promise<GuildUserSearchResult[]> {
  const { guildId } = serverConstants.discord;
  const trimmed = query.trim();

  if (!trimmed) {
    return [];
  }

  if (isDiscordSnowflake(trimmed)) {
    const found = await findDiscordUserById(trimmed);

    return found ? [found] : [];
  }

  const members = (await discordBotClient.get(
    Routes.guildMembersSearch(guildId),
    {
      query: new URLSearchParams({
        query: trimmed,
        limit: String(SEARCH_RESULT_LIMIT),
      }),
    },
  )) as APIGuildMember[];

  return members.map((member) => ({
    ...describeDiscordUser(member.user, member.nick),
    isInServer: true,
  }));
}

function classifyDiscordError(error: unknown): DiscordBanActionResult {
  if (error instanceof DiscordAPIError) {
    // The bot's own role has to carry BAN_MEMBERS and sit above the target's
    // highest role. Both are server settings, so this is worth naming rather
    // than reporting as a generic failure.
    if (error.code === RESTJSONErrorCodes.MissingPermissions) {
      return { status: 'missing-permission' };
    }

    if (error.code === RESTJSONErrorCodes.UnknownUser) {
      return { status: 'unknown-user' };
    }

    if (error.code === RESTJSONErrorCodes.UnknownBan) {
      return { status: 'not-banned' };
    }
  }

  return { status: 'failed', error: String(error) };
}

/**
 * Bans an account from the guild.
 *
 * No message deletion is requested. Discord can purge up to a week of the
 * banned account's messages on the way out, but that is irreversible and
 * separate from keeping them out, so it is deliberately not offered here.
 */
export async function banGuildUser(
  discordUserId: string,
  auditReason: string,
): Promise<DiscordBanActionResult> {
  const { guildId } = serverConstants.discord;

  try {
    await discordBotClient.put(Routes.guildBan(guildId, discordUserId), {
      reason: auditReason,
    });

    return { status: 'done' };
  } catch (error) {
    const result = classifyDiscordError(error);

    if (result.status === 'failed') {
      reportDiscordFailure(error, { discordUserId, action: 'ban' });
    }

    return result;
  }
}

/** Lifts a ban. The account is not re-invited — it is only allowed back in. */
export async function unbanGuildUser(
  discordUserId: string,
  auditReason: string,
): Promise<DiscordBanActionResult> {
  const { guildId } = serverConstants.discord;

  try {
    await discordBotClient.delete(Routes.guildBan(guildId, discordUserId), {
      reason: auditReason,
    });

    return { status: 'done' };
  } catch (error) {
    const result = classifyDiscordError(error);

    if (result.status === 'failed') {
      reportDiscordFailure(error, { discordUserId, action: 'unban' });
    }

    return result;
  }
}
