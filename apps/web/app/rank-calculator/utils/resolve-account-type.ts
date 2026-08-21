'use server';

import { AccountType } from '@/app/schemas/staff';
import {
  resolveTempleAccountType,
  TempleOSRSPlayerInfo,
} from '@/app/schemas/temple-api';
import { fetchHiscoresAccountType } from '../data-sources/fetch-hiscores-account-type';

export type AccountTypeResolution =
  /** Settled by a source that positively asserts the mode. */
  | {
      status: 'resolved';
      accountType: AccountType;
      source: 'temple' | 'hiscores';
    }
  /** Nothing that can assert a mode has one for this account. Ask the player. */
  | { status: 'unresolved' };

/**
 * Works out a player's game mode from the sources that can actually assert one.
 *
 * 1. **TempleOSRS**, which reads the individual hiscore boards and is sound for
 *    anything it does not call a main. A main reading is ambiguous: Temple
 *    reports group ironmen whose group it has not been told about in exactly
 *    the same way (see `resolveTempleAccountType`).
 * 2. **The ironman hiscore boards**, which settle solo ironmen Temple has not
 *    caught up with — including accounts Temple has never heard of.
 *
 * Only when both come up empty is the player asked, and their answer is then
 * *verified* rather than trusted, in `resolveDeclaredAccountType`.
 *
 * Two things this deliberately does not do. It never infers a `main`: that is
 * the absence of an answer, not an answer. And it has no side effects — it
 * takes the Temple record as an argument rather than fetching it, because
 * whether an account is *tracked* on Temple is a separate concern, owned by
 * the caller via `ensureTrackedOnTemple`.
 */
export async function resolveAccountType(
  playerName: string,
  templeInfo: TempleOSRSPlayerInfo['data'] | null,
): Promise<AccountTypeResolution> {
  const templeAccountType = templeInfo
    ? resolveTempleAccountType(templeInfo['Game mode'], templeInfo.GIM)
    : null;

  if (templeAccountType) {
    return {
      status: 'resolved',
      accountType: templeAccountType,
      source: 'temple',
    };
  }

  // Temple either cannot see them or reads them as a main. A listing on an
  // ironman board outranks both, being a fact rather than a reading.
  const hiscoresAccountType = await fetchHiscoresAccountType(playerName);

  if (hiscoresAccountType) {
    return {
      status: 'resolved',
      accountType: hiscoresAccountType,
      source: 'hiscores',
    };
  }

  return { status: 'unresolved' };
}
