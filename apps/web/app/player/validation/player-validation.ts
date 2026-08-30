'use server';

import { StatusCodes } from 'http-status-codes';
import { z } from 'zod';

const hiscoresUrl = 'https://secure.runescape.com/m=hiscore_oldschool';

/**
 * Only the part of `index_lite.json` we read.
 *
 * Not exported, and not in `app/schemas/` — every export of a `'use server'`
 * module has to be an async function, so a schema const here would fail the
 * build. `.passthrough()`-by-default zod object parsing means the rest of the
 * (large) response is ignored rather than having to be described.
 */
const HiscoresSkills = z.object({
  skills: z.array(
    z.object({
      name: z.string(),
      level: z.number(),
    }),
  ),
});

export interface HiscoresOverview {
  /** The hiscores know this name. */
  exists: boolean;
  /** Null means "no answer", never "zero" — see below. */
  totalLevel: number | null;
}

/**
 * What the OSRS hiscores say about an account.
 *
 * The hiscores are the cheapest source this app has — one uncached GET, no auth
 * — and the response has always carried the player's total level. Until now the
 * body was fetched and thrown away for a boolean, so reading it costs nothing
 * we were not already paying, and gives the join gate a live figure at the
 * first step of the scan rather than only Temple's synced snapshot.
 *
 * ⚠️ **Every failure yields `null`, never `0`.** A zero is a reading, and it is
 * one that fails the minimum-total-level gate — so an outage, an unparseable
 * body or an unranked Overall entry must all come back as "no answer" and let
 * `resolveTotalLevelState` fall through to Temple. Turning a third party being
 * down into a refused signup is exactly the outcome the gate is written to
 * avoid.
 *
 * ⚠️ **A thrown fetch still reports `exists: true`,** preserving the behaviour
 * `validatePlayerExists` has always had: an unhealthy query is not evidence
 * that a player does not exist, and refusing someone their account over it
 * would be worse than letting a typo through to a screen full of blanks.
 */
export async function fetchHiscoresOverview(
  playerName: string,
): Promise<HiscoresOverview> {
  try {
    const response = await fetch(
      `${hiscoresUrl}/index_lite.json?player=${encodeURIComponent(playerName)}`,
    );

    if (response.status === Number(StatusCodes.NOT_FOUND)) {
      return { exists: false, totalLevel: null };
    }

    if (!response.ok) {
      return { exists: true, totalLevel: null };
    }

    const parsed = HiscoresSkills.safeParse(await response.json());

    if (!parsed.success) {
      return { exists: true, totalLevel: null };
    }

    const overall = parsed.data.skills.find(
      ({ name }) => name.toLowerCase() === 'overall',
    );

    return {
      exists: true,
      // The hiscores use -1 for "unranked", which is an absence of a reading
      // rather than a low one.
      totalLevel:
        overall && Number.isFinite(overall.level) && overall.level > 0
          ? overall.level
          : null,
    };
  } catch {
    // Bail early if the query is unhealthy, as this doesn't
    // mean the player name is non-existent
    return { exists: true, totalLevel: null };
  }
}

export async function validatePlayerExists(playerName: string) {
  'use server';

  const { exists } = await fetchHiscoresOverview(playerName);

  return exists;
}
