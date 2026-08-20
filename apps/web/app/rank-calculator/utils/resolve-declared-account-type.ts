'use server';

import * as Sentry from '@sentry/nextjs';
import { clientConstants } from '@/config/constants.client';
import { AccountType, AccountTypeChoice } from '@/app/schemas/staff';
import { fetchGimGroup } from '../data-sources/fetch-gim-group';
import { isGroupMember } from './gim-group';

export interface ResolvedDeclaredAccountType {
  accountType: AccountType;
  gimGroupName: string | null;
}

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
 * published nowhere — come down to the player's word.
 */
export async function resolveDeclaredAccountType(
  playerName: string,
  choice: AccountTypeChoice,
  groupName?: string,
): Promise<ResolvedDeclaredAccountType> {
  if (choice !== 'group_ironman') {
    return { accountType: choice, gimGroupName: null };
  }

  const group = groupName ? await fetchGimGroup(groupName) : null;

  // A group that is not on the hiscores is an unranked group — that is the
  // definition of unranked. A typo lands here too, and looks the same; both
  // are ironmen either way, so nothing about their rank turns on it.
  if (!group || !isGroupMember(group, playerName)) {
    return { accountType: 'unranked_group_ironman', gimGroupName: null };
  }

  await trackGroupOnTemple(group.members);

  return {
    accountType: group.isHardcore ? 'hardcore_group_ironman' : 'group_ironman',
    gimGroupName: group.name,
  };
}
