'use server';

import * as Sentry from '@sentry/nextjs';
import { clientConstants } from '@/config/constants.client';
import { AccountType, AccountTypeChoice } from '@/app/schemas/staff';
import { fetchGimGroup } from '../data-sources/fetch-gim-group';
import { isGroupMember } from './gim-group';

export type ResolvedDeclaredAccountType =
  | {
      status: 'resolved';
      accountType: AccountType;
      gimGroupName: string | null;
    }
  /**
   * The named group is not on the group hiscores, or does not list this
   * player. Never silently treated as unranked: a typo and a genuinely
   * unranked group look identical from here, and only the player can say
   * which it was.
   */
  | { status: 'group-not-found' };

/**
 * Starts TempleOSRS tracking every member of a group.
 *
 * Temple's group data is opt-in — it only links a group together once its
 * members are tracked individually — so registering the whole group is what
 * makes Temple able to resolve these players by itself next time, for us and
 * for anyone else. Best effort: the player's own answer is already verified
 * against the hiscores, so a Temple failure changes nothing.
 */
async function trackGroupOnTemple(members: string[]) {
  await Promise.all(
    members.map(async (member) => {
      try {
        await fetch(
          `${clientConstants.temple.baseUrl}/php/add_datapoint.php?player=${encodeURIComponent(member)}`,
        );
      } catch (error) {
        Sentry.captureException(error);
      }
    }),
  );
}

/**
 * Turns what a player tells us about their account into a stored type.
 *
 * A claimed group ironman is *verified*, not taken on trust: the group has to
 * exist on the hiscores and list the player as a member, and the board it is
 * found on decides regular vs hardcore. Only unranked groups — which are
 * published nowhere — come down to the player's word, and they have to say so
 * explicitly rather than arriving there by a failed lookup.
 */
export async function resolveDeclaredAccountType(
  playerName: string,
  choice: AccountTypeChoice,
  groupName?: string,
): Promise<ResolvedDeclaredAccountType> {
  if (choice !== 'group_ironman') {
    return { status: 'resolved', accountType: choice, gimGroupName: null };
  }

  const group = groupName ? await fetchGimGroup(groupName) : null;

  if (!group || !isGroupMember(group, playerName)) {
    return { status: 'group-not-found' };
  }

  await trackGroupOnTemple(group.members);

  return {
    status: 'resolved',
    accountType: group.isHardcore ? 'hardcore_group_ironman' : 'group_ironman',
    gimGroupName: group.name,
  };
}
