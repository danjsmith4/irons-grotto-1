'use server';

import { AccountType } from '@/app/schemas/staff';
import {
  resolveTempleAccountType,
  TempleOSRSPlayerInfo,
} from '@/app/schemas/temple-api';
export type AccountTypeResolution =
  /** Settled by a source that positively asserts the mode. */
  | {
      status: 'resolved';
      accountType: AccountType;
      source: 'temple';
    }
  /** Nothing that can assert a mode has one for this account. Ask the player. */
  | { status: 'unresolved' };

/**
 * Works out a player's game mode from **TempleOSRS**, and nothing else.
 *
 * Temple reads the individual hiscore boards itself and is sound for anything
 * it does not call a main. A main reading is ambiguous — Temple reports group
 * ironmen whose group it has not been told about in exactly the same way (see
 * `resolveTempleAccountType`) — so that resolves to nothing and the player is
 * asked, via `resolveDeclaredAccountType`.
 *
 * **One source of truth, on purpose.** This used to fall back to probing the
 * ironman hiscore boards directly for accounts Temple could not see. That is
 * gone: it only ever changed which *badge* an account got, since
 * `rankThresholdsFor` branches on nothing but `isMainAccount` and every
 * ironman variant scores on the identical ladder. Two sources that can
 * disagree, for no difference in outcome, is a cost with no benefit. The
 * accounts it used to catch are now caught by `ensureTrackedOnTemple`
 * registering them, which fixes the answer for everyone rather than just for
 * us. Don't reintroduce the fallback.
 *
 * Two things this deliberately does not do. It never infers a `main`: that is
 * the absence of an answer, not an answer. And it has no side effects — it
 * takes the Temple record as an argument rather than fetching it, because
 * whether an account is *tracked* on Temple is a separate concern, owned by
 * the caller via `ensureTrackedOnTemple`.
 */
// Nothing is awaited any more — dropping the hiscores probe left this purely
// synchronous. It stays `async` because every export of a `'use server'`
// module has to be, and callers already await it.
// eslint-disable-next-line @typescript-eslint/require-await
export async function resolveAccountType(
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

  return { status: 'unresolved' };
}
