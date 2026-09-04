import { isRecordScorable, unscorableReason } from './is-record-scorable';

const syncedPlayer = {
  totalLevel: 2206,
  totalXp: 231_035_242,
  collectionLogCount: 524,
  storedCollectionLogRows: 524,
};

describe('unscorableReason', () => {
  it('scores a record with both halves of its collection log', () => {
    expect(unscorableReason(syncedPlayer)).toBeNull();
    expect(isRecordScorable(syncedPlayer)).toBe(true);
  });

  it('refuses a row that has never been synced', () => {
    // The schema's defaults, which is what a created-but-never-populated row
    // holds. Scoring it reports "has done nothing" when the truth is "nobody
    // has ever asked".
    expect(
      unscorableReason({
        totalLevel: 32,
        totalXp: 1154,
        collectionLogCount: 0,
        storedCollectionLogRows: 0,
      }),
    ).toBe('never-synced');
  });

  it('refuses a record whose collection log rows have gone missing', () => {
    // Seen live: the scalar count survives while the itemised rows are
    // stranded under an old name by a rename. Scoring this awards the logged
    // slots and none of the notable items behind them.
    expect(
      unscorableReason({ ...syncedPlayer, storedCollectionLogRows: 0 }),
    ).toBe('collection-log-missing');
  });

  it('scores a genuinely empty collection log on an otherwise synced account', () => {
    // Zero rows is only suspicious when the scalar disagrees. A real account
    // with nothing logged yet must still be scorable, or a new member could
    // never be scored at all.
    expect(
      unscorableReason({
        totalLevel: 750,
        totalXp: 2_000_000,
        collectionLogCount: 0,
        storedCollectionLogRows: 0,
      }),
    ).toBeNull();
  });

  it('does not mistake a low-level account with real progress for a stub', () => {
    expect(
      unscorableReason({
        totalLevel: 32,
        totalXp: 1154,
        collectionLogCount: 3,
        storedCollectionLogRows: 3,
      }),
    ).toBeNull();
  });
});
