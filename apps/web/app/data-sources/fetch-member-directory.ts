import * as Sentry from '@sentry/nextjs';
import { list } from '@vercel/blob';
import { db } from '@/lib/db';
import { players } from '@/lib/db/schema';
import { ClanMemberList } from '@/app/schemas/inactivity-checker';
import type { AccountType } from '@/app/schemas/staff';

export interface DirectoryMember {
  rsn: string;
  /**
   * The account's game mode, when this site already knows it. Null covers both
   * "not registered here yet" and "registered but unresolved" — neither is
   * something to show a badge for, and the difference does not matter to
   * someone picking their own name out of a list.
   */
  accountType: AccountType | null;
}

/**
 * The clan roster, with a game mode against each name we already know.
 *
 * The blob export is the roster of record — it is the clan's own member list,
 * and it is what onboarding matches a typed name against. The database only
 * decorates it: a member who has used this site before gets their helmet shown
 * beside their name in the search, which is the difference between a list of
 * strings and a list of people.
 *
 * Fails soft to an empty list. A missing roster costs the name suggestions and
 * nothing else — a player can always type their name in full.
 */
export async function fetchMemberDirectory(): Promise<DirectoryMember[]> {
  try {
    const [roster, knownAccounts] = await Promise.all([
      (async () => {
        const blobList = await list({ prefix: 'members' });
        const [newest] = blobList.blobs.sort(
          (a, b) => +b.uploadedAt - +a.uploadedAt,
        );

        if (!newest) {
          return [];
        }

        const response = await fetch(newest.url);

        return ClanMemberList.parse(await response.json());
      })(),
      db
        .select({
          playerName: players.playerName,
          accountType: players.accountType,
        })
        .from(players),
    ]);

    const accountTypeByName = new Map(
      knownAccounts.map(({ playerName, accountType }) => [
        playerName.toLowerCase(),
        accountType,
      ]),
    );

    return roster.map(({ rsn }) => ({
      rsn,
      accountType: accountTypeByName.get(rsn.toLowerCase()) ?? null,
    }));
  } catch (error) {
    Sentry.captureException(error);

    return [];
  }
}
