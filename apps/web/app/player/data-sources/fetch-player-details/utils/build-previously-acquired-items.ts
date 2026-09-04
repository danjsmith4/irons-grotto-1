export interface PreviouslyAcquiredItemSources {
  /**
   * A draft the player is mid-edit on. Wins outright where it has an opinion —
   * and `undefined` is not one, which is why the values are optional here
   * rather than coerced at the call site.
   */
  savedAcquiredItems?: Record<string, boolean | undefined>;
  /** Ticks the player made that no data source accounts for. */
  storedOverrides: Record<string, boolean>;
  /** The six items nothing logs, when WikiSync did not answer. */
  storedDerivedItems: Record<string, boolean>;
  /** Every notable item the durable collection log copy settles. */
  storedCollectionLogItems: Record<string, boolean>;
}

/**
 * The floor under a live source read: everything already known to be owned,
 * whatever this particular response said.
 *
 * The ordering is a precedence, most authoritative first — the player's own
 * draft, then their overrides, then the derived items, then the stored
 * collection log. `??` throughout rather than `||`, because a stored `false`
 * is a real answer and must not fall through to the next source.
 *
 * ⚠️ **The collection log belongs here and used to be missing**, which is the
 * bug this function exists to make hard to reintroduce. Overrides and derived
 * items had a floor; the log itself did not, so a Temple response that omitted
 * an item — because its names had drifted, or it came back partial, or the
 * endpoint was down — silently dropped that item from the player's sheet. A
 * collection log slot cannot be un-earned, so an item's absence from a
 * response means the response did not mention it, never that it was given
 * back. Measured on a live member: 17 items they own, 654 points, missing from
 * their own sheet while the leaderboard showed them.
 *
 * This is a floor, not a replacement — the caller unions it with the live
 * read, which is what discovers anything new.
 */
export function buildPreviouslyAcquiredItems({
  savedAcquiredItems,
  storedOverrides,
  storedDerivedItems,
  storedCollectionLogItems,
}: PreviouslyAcquiredItemSources): string[] {
  return Object.keys({
    ...storedCollectionLogItems,
    ...storedDerivedItems,
    ...storedOverrides,
    ...(savedAcquiredItems ?? {}),
  }).filter(
    (key) =>
      savedAcquiredItems?.[key] ??
      storedOverrides[key] ??
      storedDerivedItems[key] ??
      storedCollectionLogItems[key],
  );
}
