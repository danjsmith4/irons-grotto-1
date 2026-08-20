'use server';

import * as Sentry from '@sentry/nextjs';
import { GimGroup, parseGroupMembers } from '../utils/gim-group';

/**
 * The OSRS group ironman hiscores. Groups live under the individual ironman
 * boards, split by whether the group is hardcore — which board a group is
 * found on is the only public way to tell a GIM from a HCGIM.
 *
 * There is no player -> group lookup anywhere in the hiscores: `user1`,
 * `player` and friends are silently ignored, and the only search parameter is
 * `groupName`. Hence the player tells us the group name and we verify it here.
 */
const groupBoards = [
  {
    url: 'https://secure.runescape.com/m=hiscore_oldschool_ironman/group-ironman/view-group',
    isHardcore: false,
  },
  {
    url: 'https://secure.runescape.com/m=hiscore_oldschool_hardcore_ironman/group-ironman/view-group',
    isHardcore: true,
  },
] as const;

async function fetchGroupFromBoard(
  url: string,
  isHardcore: boolean,
  groupName: string,
): Promise<GimGroup | null> {
  try {
    const response = await fetch(
      `${url}?name=${encodeURIComponent(groupName)}`,
      { headers: { 'User-Agent': 'Irons-Grotto-Rank-Calculator' } },
    );

    if (!response.ok) {
      return null;
    }

    const members = parseGroupMembers(await response.text());

    // An unknown group still renders the page, just without a member table.
    return members.length ? { name: groupName, isHardcore, members } : null;
  } catch (error) {
    Sentry.captureException(error);

    return null;
  }
}

/**
 * Looks a group up by name across both boards.
 *
 * Only *ranked* groups are listed, so a miss means either a typo or an
 * unranked group — the two are indistinguishable, and the caller treats a miss
 * as unranked.
 */
export async function fetchGimGroup(
  groupName: string,
): Promise<GimGroup | null> {
  const trimmed = groupName.trim();

  if (!trimmed) {
    return null;
  }

  const results = await Promise.all(
    groupBoards.map(({ url, isHardcore }) =>
      fetchGroupFromBoard(url, isHardcore, trimmed),
    ),
  );

  return results.find(Boolean) ?? null;
}
