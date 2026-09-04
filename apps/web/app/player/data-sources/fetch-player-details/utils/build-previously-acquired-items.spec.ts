import { buildPreviouslyAcquiredItems } from './build-previously-acquired-items';

const empty = {
  storedOverrides: {},
  storedDerivedItems: {},
  storedCollectionLogItems: {},
};

describe('buildPreviouslyAcquiredItems', () => {
  it('floors a live read with the stored collection log', () => {
    // The regression this exists for: Temple omitted items the player owns —
    // drifted names, a partial response, an outage — and without the log in
    // the floor they vanished from the player's own sheet.
    expect(
      buildPreviouslyAcquiredItems({
        ...empty,
        storedCollectionLogItems: { 'Twisted bow': true, 'Lil zik': true },
      }),
    ).toEqual(['Twisted bow', 'Lil zik']);
  });

  it('keeps overrides and derived items in the floor', () => {
    expect(
      buildPreviouslyAcquiredItems({
        ...empty,
        storedOverrides: { 'Jar of venom': true },
        storedDerivedItems: { 'Quest cape': true },
      }).sort(),
    ).toEqual(['Jar of venom', 'Quest cape']);
  });

  it('lets a more authoritative source say no', () => {
    // An explicit false is an answer, not an absence — it must not fall
    // through to the source beneath it.
    expect(
      buildPreviouslyAcquiredItems({
        ...empty,
        storedOverrides: { 'Twisted bow': false },
        storedCollectionLogItems: { 'Twisted bow': true },
      }),
    ).toEqual([]);
  });

  it('lets a draft override a stored answer in both directions', () => {
    expect(
      buildPreviouslyAcquiredItems({
        ...empty,
        savedAcquiredItems: { 'Twisted bow': false, Scythe: true },
        storedCollectionLogItems: { 'Twisted bow': true },
      }),
    ).toEqual(['Scythe']);
  });

  it('does not treat a stored false as ownership', () => {
    expect(
      buildPreviouslyAcquiredItems({
        ...empty,
        storedDerivedItems: { 'Music cape': false },
      }),
    ).toEqual([]);
  });
});
