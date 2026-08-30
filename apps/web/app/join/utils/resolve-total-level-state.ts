import { minimumJoinTotalLevel } from '@/config/clan-requirements';

export type TotalLevelState =
  /** At or above the clan's floor. */
  | { status: 'met'; totalLevel: number }
  /** Below it — the one state that stops a signup. */
  | { status: 'short'; totalLevel: number; shortfall: number }
  /** Neither source could answer. Treated as met rather than blocking. */
  | { status: 'unknown' };

/**
 * Whether an account clears the clan's minimum total level.
 *
 * This is a spec'd function rather than a condition in a component for the same
 * reason `canPassCollectionLogGate` is: it decides whether a member gets in. It
 * also has to be importable by the server action, because the browser is not
 * what decides who qualifies — the client and the server must be reading the
 * identical rule, or a member passes one and is refused by the other.
 *
 * ⚠️ **Two sources, and the higher wins.** The hiscores figure is live and
 * authoritative; Temple's is a sync snapshot that can lag by weeks. Taking the
 * higher means a stale Temple record can never refuse someone who has actually
 * trained past the line, and a hiscores response we could not parse can never
 * refuse someone Temple can vouch for.
 *
 * ⚠️ **An unreadable source is never a failure.** With both readings missing —
 * the hiscores were down, Temple has never seen the account — there is nothing
 * to judge and the result is `unknown`, which does not block. This is the same
 * call `resolveCollectionLogState` makes, for the same reason: refusing a real
 * member their account because a third party was unreachable is a far worse
 * outcome than admitting someone who has to be spoken to later. It is also why
 * the callers must pass `null` for "no answer" and never `0` — a zero is a
 * reading, and it is one that fails.
 */
export function resolveTotalLevelState(
  hiscoresTotalLevel: number | null,
  templeTotalLevel: number | null,
): TotalLevelState {
  const readings = [hiscoresTotalLevel, templeTotalLevel].filter(
    (level): level is number => level != null,
  );

  if (readings.length === 0) {
    return { status: 'unknown' };
  }

  const totalLevel = Math.max(...readings);

  if (totalLevel >= minimumJoinTotalLevel) {
    return { status: 'met', totalLevel };
  }

  return {
    status: 'short',
    totalLevel,
    shortfall: minimumJoinTotalLevel - totalLevel,
  };
}

/**
 * Whether onboarding may continue past the total level gate.
 *
 * Only a confirmed reading below the line stops it — `unknown` passes, per the
 * note above. There is deliberately no escape hatch equivalent to the
 * collection log's mobile-only checkbox: that one exists because the log gate
 * asks for something a mobile player physically cannot do, and a total level is
 * not that.
 *
 * Written as a type predicate so that a caller inside the refusal branch has
 * the level and the shortfall to hand without re-testing `status` — the two
 * places that refuse a signup both need those numbers to say anything useful.
 */
export function canPassTotalLevelGate(
  state: TotalLevelState,
): state is Exclude<TotalLevelState, { status: 'short' }> {
  return state.status !== 'short';
}
