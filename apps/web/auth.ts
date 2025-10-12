import 'next-auth/jwt';
import NextAuth, { NextAuthConfig } from 'next-auth';
import Discord, { DiscordProfile } from 'next-auth/providers/discord';
import * as Sentry from '@sentry/nextjs';
import {
  APIGuild,
  OAuth2Scopes,
  Routes,
  RESTJSONErrorCodes,
} from 'discord-api-types/v10';
import { DiscordAPIError } from '@discordjs/rest';
import { discordBotClient, discordUserClient } from './discord';
import { serverConstants } from './config/constants.server';

declare module 'next-auth' {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface Profile extends DiscordProfile { }

  interface User {
    permissions: string;
  }
}

declare module 'next-auth/jwt' {
  /** Returned by the `jwt` callback and `auth`, when using JWT sessions */

  interface JWT {
    id: string;
    permissions: string;
  }
}

export const config = {
  debug: /\*|nextauth/.test(process.env.DEBUG ?? ''),
  callbacks: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async signIn(params: any) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const { account, profile } = params;

      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      if (!profile?.id) {
        throw new Error('Discord user not found');
      }

      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      Sentry.setUser({ id: profile.id, username: profile?.name ?? 'Unknown' });

      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      if (!account?.access_token) {
        throw new Error('Access token not found');
      }

      const { guildId } = serverConstants.discord;

      // Check if this is an admin login flow by looking at the request URL
      // Admin logins come from /bingo/admin redirectTo parameter
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      const redirectTo = params.redirectTo as string | undefined;
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      const callbackUrl = params.callbackUrl as string | undefined;
      const isAdminLogin = redirectTo?.includes('/bingo/admin') ??
        callbackUrl?.includes('/bingo/admin') ??
        false;

      // Skip guild member check for admin logins
      if (!isAdminLogin) {
        try {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
          await discordBotClient.get(Routes.guildMember(guildId, profile.id));
        } catch (error) {
          if (
            error instanceof DiscordAPIError &&
            error.code === RESTJSONErrorCodes.UnknownMember
          ) {
            Sentry.addBreadcrumb({
              // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
              data: { id: profile.id, username: profile.username },
              category: 'Auth',
              message: `User attempted to log in but was not found in the Discord server`,
              level: 'error',
            });
          }

          throw error;
        }
      }

      return true;
    }, async jwt({ profile, token, account }) {
      const { guildId } = serverConstants.discord;

      if (profile?.id) {
        token.id = profile.id;
      }

      if (account?.access_token) {
        try {
          const userGuildsResponse = (await discordUserClient(
            account.access_token,
          ).get(Routes.userGuilds(), { authPrefix: 'Bearer' })) as APIGuild[];

          const { permissions } =
            userGuildsResponse.find(({ id }) => id === guildId) ?? {};

          if (!permissions) {
            throw new Error('No permissions found for user');
          }

          token.permissions = permissions;
        } catch (error) {
          console.error(error);

          Sentry.captureException(error);
        }
      }

      return token;
    },
    session({ session, token }) {
      session.user.id = token.id;
      session.user.permissions = token.permissions;

      Sentry.setUser({ id: token.id, username: token.name ?? undefined });

      return session;
    },
  },

  logger: {
    error: (error) => {
      console.error(error);

      Sentry.captureException(error);
    },
  },
  providers: [
    Discord<DiscordProfile>({
      authorization: `https://discord.com/api/${Routes.oauth2Authorization()}?scope=${OAuth2Scopes.Identify}+${OAuth2Scopes.Guilds}+${OAuth2Scopes.GuildsMembersRead}`,
    }),
  ],
} satisfies NextAuthConfig;

export const { handlers, signIn, signOut, auth } = NextAuth(config);
