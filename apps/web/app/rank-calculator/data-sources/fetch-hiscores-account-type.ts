'use server';

import * as Sentry from '@sentry/nextjs';
import { AccountType } from '@/app/schemas/staff';

/**
 * The individual ironman hiscore boards.
 *
 * Jagex publishes one board per solo game mode, and an account appears on a
 * board only if it is that mode — so a 200 here is a *positive* assertion of
 * ironman status, straight from the game. That makes it the one source that
 * can settle a solo ironman TempleOSRS has never been told about, without
 * anybody having to vouch for themselves.
 *
 * Order matters. Hardcore and ultimate accounts are listed on the plain
 * ironman board as well as their own, so the specific boards are read first
 * and the plain board is the fallback — which also means a hardcore ironman
 * who has died correctly falls through to `ironman`.
 *
 * Group ironmen appear on none of these; the group boards are a separate
 * lookup with no player -> group search (see `fetchGimGroup`). So a miss here
 * is not evidence of a main.
 */
const soloIronmanBoards = [
  {
    url: 'https://secure.runescape.com/m=hiscore_oldschool_hardcore_ironman/index_lite.json',
    accountType: 'hardcore_ironman',
  },
  {
    url: 'https://secure.runescape.com/m=hiscore_oldschool_ultimate/index_lite.json',
    accountType: 'ultimate_ironman',
  },
  {
    url: 'https://secure.runescape.com/m=hiscore_oldschool_ironman/index_lite.json',
    accountType: 'ironman',
  },
] as const satisfies readonly { url: string; accountType: AccountType }[];

async function isListedOnBoard(url: string, playerName: string) {
  try {
    const response = await fetch(
      `${url}?player=${encodeURIComponent(playerName)}`,
      { headers: { 'User-Agent': 'Irons-Grotto-Rank-Calculator' } },
    );

    return response.ok;
  } catch (error) {
    // An unreachable board is not evidence that the player is absent from it,
    // but it is all we have — treat it as a miss and let the other boards
    // still have their say.
    Sentry.captureException(error);

    return false;
  }
}

/**
 * Reads a player's solo game mode off the ironman hiscores.
 *
 * Returns null when they are on none of the boards, which means main *or*
 * group ironman — the boards cannot tell those apart, so a caller must never
 * read null here as a main.
 */
export async function fetchHiscoresAccountType(
  playerName: string,
): Promise<AccountType | null> {
  const listings = await Promise.all(
    soloIronmanBoards.map(({ url }) => isListedOnBoard(url, playerName)),
  );

  return (
    soloIronmanBoards.find((_, index) => listings[index])?.accountType ?? null
  );
}
