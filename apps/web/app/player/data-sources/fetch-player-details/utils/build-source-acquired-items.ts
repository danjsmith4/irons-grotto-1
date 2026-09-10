export interface SourceAcquiredItemSources {
  /** What this run's live source read settled on its own. */
  liveAcquiredItems: Iterable<string>;
  /**
   * Every notable item the durable collection log copy settles —
   * `player_acquired_items`, written only ever from Temple's own responses.
   */
  storedCollectionLogItems: Record<string, boolean>;
}

/**
 * The evidence side of the moderator submission diff.
 *
 * The diff exists to show where a member's claim outruns what any source can
 * account for, so this is deliberately **everything a source has ever
 * settled** — not what one response happened to say this minute.
 *
 * ⚠️ **A single response is not the evidence.** A collection log slot cannot be
 * un-earned, so an item missing from a Temple response means the response did
 * not mention it — never that the member does not own it. Responses come back
 * partial, Temple's item names drift, and the endpoint goes down. Scoring has
 * always known this (`buildPreviouslyAcquiredItems` floors the live read with
 * the same rows); the diff did not, and a Temple casing change (`Ikkle Hydra`,
 * `Remnant of Akkha`, …) turned 23 of one member's own logged drops into
 * fabricated "unverified claims" and blocked their auto-approval.
 *
 * ⚠️ **`player_item_overrides` is deliberately absent.** Those are the member's
 * own ticks, backed by nothing, and flagging them is the entire point of the
 * diff — never add them here.
 */
export function buildSourceAcquiredItems({
  liveAcquiredItems,
  storedCollectionLogItems,
}: SourceAcquiredItemSources): string[] {
  return [
    ...new Set([
      ...liveAcquiredItems,
      ...Object.keys(storedCollectionLogItems).filter(
        (itemName) => storedCollectionLogItems[itemName],
      ),
    ]),
  ];
}
