export interface ResolveDerivedItemWriteInput {
  /** The notable items nothing logs — `getSourceDerivedItemNames`. */
  itemNames: string[];
  /**
   * Whether the deriving source answered at all this run. This is the whole
   * point of the function: see the note below.
   */
  sourceAnswered: boolean;
  /** The items the source reported. Meaningless when it did not answer. */
  sourceItems: Iterable<string>;
}

/**
 * What to record about the unlogged items after a sync — and whether to record
 * anything at all.
 *
 * `null` means **write nothing**. That is not a detail: the six items this
 * covers are settled purely by WikiSync, so a failed read produces an empty
 * `sourceItems` that is indistinguishable from a member genuinely having none
 * of them. Persisting that would overwrite six good `true`s with `false` and
 * turn a temporary outage into a permanent one, which is the precise failure
 * `player_derived_items` was added to prevent.
 *
 * The guard lives in here rather than as an `if` at the call site because an
 * `if` at a call site is one careless edit from being deleted, and the damage
 * would be silent — the member simply scores up to 480 points less, and
 * nothing records that they ever scored more.
 */
export function resolveDerivedItemWrite({
  itemNames,
  sourceAnswered,
  sourceItems,
}: ResolveDerivedItemWriteInput): Record<string, boolean> | null {
  if (!sourceAnswered) {
    return null;
  }

  const reported = new Set(sourceItems);

  return itemNames.reduce<Record<string, boolean>>(
    (acc, itemName) => ({ ...acc, [itemName]: reported.has(itemName) }),
    {},
  );
}
