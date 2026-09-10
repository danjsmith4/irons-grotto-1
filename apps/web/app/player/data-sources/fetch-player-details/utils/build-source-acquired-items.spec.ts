import { buildSourceAcquiredItems } from './build-source-acquired-items';

describe('buildSourceAcquiredItems', () => {
  it('counts an item the live read settled', () => {
    expect(
      buildSourceAcquiredItems({
        liveAcquiredItems: ['Bandos chestplate'],
        storedCollectionLogItems: {},
      }),
    ).toEqual(['Bandos chestplate']);
  });

  it('counts an item only the stored collection log settles', () => {
    // The case that broke real applications: Temple title-cased the item, so
    // this run's response no longer matched it, while the durable copy written
    // by an earlier sync still did. The member did not stop owning it.
    expect(
      buildSourceAcquiredItems({
        liveAcquiredItems: [],
        storedCollectionLogItems: { 'Ikkle hydra': true },
      }),
    ).toEqual(['Ikkle hydra']);
  });

  it('does not double-count an item both settle', () => {
    expect(
      buildSourceAcquiredItems({
        liveAcquiredItems: ['Ikkle hydra'],
        storedCollectionLogItems: { 'Ikkle hydra': true },
      }),
    ).toEqual(['Ikkle hydra']);
  });

  it('leaves out a claim no source accounts for', () => {
    // A member's own tick lives in `player_item_overrides` and reaches neither
    // input here. Surfacing it to the moderator is the diff's whole job.
    expect(
      buildSourceAcquiredItems({
        liveAcquiredItems: ['Bandos chestplate'],
        storedCollectionLogItems: {},
      }),
    ).not.toContain('Scythe of vitur');
  });
});
