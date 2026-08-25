'use server';

import * as Sentry from '@sentry/nextjs';
import { clientConstants } from '@/config/constants.client';
import { TempleOSRSPlayerInfo } from '@/app/schemas/temple-api';
import { fetchTemplePlayerInfo } from './fetch-temple-player-info';

export interface TempleTracking {
  /** TempleOSRS has a record for this account. */
  isTracked: boolean;
  /** Returned so callers never have to fetch it a second time. */
  info: TempleOSRSPlayerInfo['data'] | null;
  /** We registered it during this call, rather than finding it already there. */
  didRegister: boolean;
}

/**
 * How long to wait before asking Temple again, per attempt.
 *
 * `add_datapoint.php` queues the account rather than answering with it, so the
 * record does not exist the instant the call returns. Three attempts inside
 * about ten seconds is enough in practice, and nothing depends on it
 * succeeding — a player Temple still cannot see is simply reported as
 * untracked.
 */
const recheckDelaysMs = [1500, 3000, 5000];

const sleep = (ms: number) =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

/**
 * Registers a player with TempleOSRS.
 *
 * Temple's data is opt-in: it only tracks accounts somebody has asked it to.
 * Registering is what makes it able to answer for a player at all, for us and
 * for anyone else.
 *
 * Rate limit: Temple allows ~10 datapoint requests a minute, which is exactly
 * the cadence of the batch loop's existing 6s delay, so one registration per
 * player fits inside it.
 */
export async function registerOnTemple(playerName: string) {
  try {
    await fetch(
      `${clientConstants.temple.baseUrl}/php/add_datapoint.php?player=${encodeURIComponent(playerName)}`,
    );

    return true;
  } catch (error) {
    Sentry.captureException(error);

    return false;
  }
}

/**
 * Makes sure TempleOSRS knows about an account, registering it if not.
 *
 * An account Temple has never seen is not a fact about the account — it means
 * nobody has ever asked Temple to look. So rather than treating that gap as an
 * answer, we close it: register, give Temple a moment, and check again.
 *
 * This is purely about *tracking*. It deliberately says nothing about game
 * modes — the calculator needs a player tracked because every stat it scores
 * comes from Temple, quite apart from what mode they play. Working out an
 * account type from the result is the caller's job, via `resolveAccountType`.
 */
export async function ensureTrackedOnTemple(
  playerName: string,
): Promise<TempleTracking> {
  const existing = await fetchTemplePlayerInfo(playerName);

  if (existing) {
    return { isTracked: true, info: existing, didRegister: false };
  }

  await registerOnTemple(playerName);

  // Sequential on purpose: each attempt is a fresh chance for Temple to have
  // caught up, so there is nothing to parallelise.
  for (const delay of recheckDelaysMs) {
    await sleep(delay);

    const info = await fetchTemplePlayerInfo(playerName);

    if (info) {
      return { isTracked: true, info, didRegister: true };
    }
  }

  return { isTracked: false, info: null, didRegister: true };
}
