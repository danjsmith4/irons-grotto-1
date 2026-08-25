import type { CollectionLogScan, TempleScan } from '../scan-types';

export type CollectionLogState =
  /** TempleOSRS has a log and it matches what the hiscores say. */
  | { status: 'ready' }
  /** TempleOSRS has never seen a log for this account. */
  | { status: 'missing' }
  /** TempleOSRS has a log, but it is behind the player's real one. */
  | { status: 'behind'; templeSlots: number; hiscoresSlots: number }
  /** Nothing to compare against — treated as ready rather than blocking. */
  | { status: 'unknown' };

/**
 * Whether a player's TempleOSRS collection log is good enough to score them on.
 *
 * This is the one blocking gate in onboarding, so it is a spec'd function
 * rather than a condition in a component: it decides whether a member gets in.
 *
 * ⚠️ **A stale log is worse than a missing one.** A log Temple has not seen for
 * six months still parses, still produces a number, and still scores — just
 * lower than the truth. A member who signs up in that state gets a rank below
 * the one they earned and no indication why, which is exactly the failure the
 * gate exists to catch. The hiscores count is the truth; Temple's is whatever
 * their last sync uploaded, so Temple being smaller means the sync is behind.
 *
 * ⚠️ **An unreadable source is never a failure.** When either count is missing
 * — the hiscores were down, Temple did not answer, the account is too new to
 * have either — there is nothing to compare and the result is `unknown`, which
 * does not block. Refusing a real member their account because a third party
 * was unreachable would be a far worse outcome than scoring them slightly low
 * on their first sync, which the next refresh corrects anyway.
 */
export function resolveCollectionLogState(
  temple: Pick<TempleScan, 'hiscoresClogSlots'> | null,
  collectionLog: Pick<
    CollectionLogScan,
    'hasCollectionLog' | 'clogSlots'
  > | null,
): CollectionLogState {
  if (!collectionLog?.hasCollectionLog) {
    return { status: 'missing' };
  }

  const templeSlots = collectionLog.clogSlots;
  const hiscoresSlots = temple?.hiscoresClogSlots ?? null;

  if (templeSlots == null || hiscoresSlots == null) {
    return { status: 'unknown' };
  }

  if (templeSlots < hiscoresSlots) {
    return { status: 'behind', templeSlots, hiscoresSlots };
  }

  return { status: 'ready' };
}

/**
 * Whether onboarding may continue past the collection log gate.
 *
 * The mobile-only escape hatch is the reason this takes two arguments. The sync
 * button lives in RuneLite's TempleOSRS plugin, so a mobile-only player has no
 * way to press it — blocking them would be asking for something they cannot do.
 * They pass, and `isMobileOnly` is recorded on their player row, which is the
 * same flag the calculator already uses to explain a thin collection log.
 */
export function canPassCollectionLogGate(
  state: CollectionLogState,
  isMobileOnly: boolean,
) {
  return state.status === 'ready' || state.status === 'unknown' || isMobileOnly;
}
