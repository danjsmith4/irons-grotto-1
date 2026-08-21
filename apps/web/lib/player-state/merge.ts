/**
 * How a single stored value and a single incoming value combine.
 *
 * Every rule is pure, total, and obeys one convention that the whole design
 * rests on:
 *
 * > **`undefined` means "unknown", never `false` and never `0`.**
 *
 * A patch omits what its author could not establish. A WikiSync outage does not
 * report "no blood torva" — it reports nothing at all, and a rule that receives
 * `undefined` must leave the stored value alone. Getting this wrong is what
 * silently unset members' blood torva and zeroed their clue counts: the old
 * write path mapped a missing source to `false`/`0` and then wrote it.
 *
 * `null`, `false`, `0` and `''` are *values*. Only `undefined` is absence.
 */
export type MergeRule<T> = (stored: T, incoming: T | undefined) => T;

/** Null, undefined and empty string all count as "no value stored yet". */
function isAbsent(value: unknown): boolean {
  return value === null || value === undefined || value === '';
}

/**
 * The value never changes once the row exists. Renames and other structural
 * moves happen outside the patch system, in their own transactions.
 */
export function immutable<T>(): MergeRule<T> {
  return (stored) => stored;
}

/**
 * The write path owns this column outright — a patch can never set it. Used for
 * bookkeeping like `updatedAt`, and for derived columns, which are recomputed
 * after the merge rather than supplied.
 */
export function managed<T>(): MergeRule<T> {
  return (stored) => stored;
}

/**
 * Recomputed from other fields after every merge. Identical in behaviour to
 * `managed`, named separately because it documents *why* the patch is ignored:
 * the value is a function of other columns, so accepting it as input would let
 * a caller assert something the data contradicts.
 */
export function recomputed<T>(): MergeRule<T> {
  return (stored) => stored;
}

/**
 * Take the incoming value whenever one was supplied.
 *
 * For columns where the source is authoritative and a value may legitimately go
 * **down** — Temple periodically recalculates EHB/EHP rates, and bonus points
 * fall when a Discord role is removed.
 */
export function preferFresh<T>(): MergeRule<T> {
  // NOT `incoming ?? stored`: `??` also swallows null, and null is a value here
  // rather than an absence. Only `undefined` means the source said nothing.
  // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
  return (stored, incoming) => (incoming === undefined ? stored : incoming);
}

/**
 * Take the incoming value whenever one was supplied.
 *
 * Behaviourally identical to {@link preferFresh}, kept separate because it
 * means something different: this column belongs to the player, and they must
 * be able to set it back to nothing. `null`, `false` and `''` are all real
 * choices here — which is precisely what the old `if (proofLink)` guard got
 * wrong, making a proof link impossible to clear once set.
 */
export function replace<T>(): MergeRule<T> {
  // NOT `incoming ?? stored` — that is the proof-link bug in a different
  // spelling. Clearing a field to null is exactly what this rule must allow.
  // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
  return (stored, incoming) => (incoming === undefined ? stored : incoming);
}

/**
 * Only fill a gap; never overwrite something already there. Used for the
 * Discord id, which is claimed once and then belongs to that account.
 */
export function fillOnly<T>(): MergeRule<T> {
  return (stored, incoming) =>
    isAbsent(stored) && incoming !== undefined ? incoming : stored;
}

/**
 * Keep whichever number is larger.
 *
 * These columns only ever go up in the game, so a smaller incoming value means
 * the source is incomplete rather than that the player regressed. This is the
 * rule that stops a Temple hiccup zeroing someone's clue counts.
 */
export function keepHighest(): MergeRule<number> {
  return (stored, incoming) =>
    incoming === undefined ? stored : Math.max(stored, incoming);
}

/**
 * Once true, stays true.
 *
 * The player owns the claim and a source can only ever confirm it. A source
 * that has gone quiet reports `undefined`; one that reports `false` is saying
 * "I cannot see this", not "they don't have it". A false claim is caught by the
 * moderator diff at submission, not by silently overwriting the player.
 */
export function keepTrue(): MergeRule<boolean> {
  return (stored, incoming) => stored || (incoming ?? false);
}

/**
 * Keep whichever value sits higher in an explicit ranking — the ordered
 * equivalent of {@link keepHighest}, for tiers and capes.
 *
 * The ranking is passed in rather than read off the zod enum's declaration
 * order, so reordering an enum for readability cannot silently change which
 * value wins. A value missing from the ranking is treated as lowest, so an
 * unrecognised stored value still yields to a recognised incoming one.
 */
export function keepHighestOrdinal<T>(ranking: readonly T[]): MergeRule<T> {
  return (stored, incoming) => {
    if (incoming === undefined) return stored;

    return ranking.indexOf(incoming) > ranking.indexOf(stored)
      ? incoming
      : stored;
  };
}

/**
 * A non-null incoming value wins; null leaves the stored value alone.
 *
 * For account type, where null is not a value but the *absence of an answer* —
 * `resolveTempleAccountType` returns null both for a real main and for a group
 * ironman Temple has never heard of. A resolution that says nothing must not
 * erase one that said something.
 */
export function preferResolved<T>(): MergeRule<T | null> {
  // The one rule where `??` is genuinely the right operator: null and undefined
  // mean the same thing here — nobody could establish an answer — and neither
  // may erase a stored one. Contrast `replace` above, where null is a value.
  return (stored, incoming) => incoming ?? stored;
}
