/**
 * Whether a player's stored record can be scored faithfully.
 *
 * Scoring from the database is only as honest as the database. Two shapes of
 * record produce a number that looks like a score and is not one, and writing
 * either would replace a member's total with a fiction:
 *
 * - **A stub.** A row created but never synced still holds the schema's
 *   defaults — total level 32, total XP 1154, nothing logged. Scoring it says
 *   "this member has done almost nothing", when what the record actually says
 *   is "nobody has ever asked".
 * - **A record whose collection log went missing.** `players.collection_log_count`
 *   is a scalar written from Temple, while every notable item is settled from
 *   the `player_acquired_items` rows. A record claiming hundreds of logged
 *   slots with no rows behind them has lost the itemised half — seen live on a
 *   member with 524 slots and zero rows, alongside fourteen orphaned owners
 *   whose rows survived under a name no `players` row has any more (the child
 *   tables match on name, exactly and case-sensitively, so a rename strands
 *   them). Scoring that awards the slots and none of the items.
 *
 * This is the same rule `player_derived_items` is built on: **the absence of a
 * row is a third state.** It means the source has never been read, not that
 * the answer is no, and the two must never be collapsed.
 *
 * The response is to leave the stored total alone and say so, so the record
 * gets refreshed and a person looks at it — never to publish the lower number.
 * A member watching their total drop by two thousand points has no way to tell
 * a correction from a bug, and they would be right not to.
 */

/** The values a `players` row holds before anything has ever been written. */
const neverSyncedTotalLevel = 32;
const neverSyncedTotalXp = 1154;

export type UnscorableReason = 'never-synced' | 'collection-log-missing';

export interface ScorableRecordInput {
  totalLevel: number;
  totalXp: number;
  collectionLogCount: number;
  /** How many `player_acquired_items` rows exist for this player. */
  storedCollectionLogRows: number;
}

export function unscorableReason({
  totalLevel,
  totalXp,
  collectionLogCount,
  storedCollectionLogRows,
}: ScorableRecordInput): UnscorableReason | null {
  if (
    totalLevel <= neverSyncedTotalLevel &&
    totalXp <= neverSyncedTotalXp &&
    collectionLogCount === 0
  ) {
    return 'never-synced';
  }

  if (collectionLogCount > 0 && storedCollectionLogRows === 0) {
    return 'collection-log-missing';
  }

  return null;
}

export function isRecordScorable(input: ScorableRecordInput): boolean {
  return unscorableReason(input) === null;
}
