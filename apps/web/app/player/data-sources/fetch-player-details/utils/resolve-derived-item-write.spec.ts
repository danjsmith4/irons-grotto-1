import { resolveDerivedItemWrite } from './resolve-derived-item-write';

const itemNames = ['Quest cape', 'Music cape', '6 Jads'];

describe('resolveDerivedItemWrite', () => {
  it('records what the source said, item by item', () => {
    expect(
      resolveDerivedItemWrite({
        itemNames,
        sourceAnswered: true,
        sourceItems: ['Quest cape', '6 Jads'],
      }),
    ).toEqual({
      'Quest cape': true,
      'Music cape': false,
      '6 Jads': true,
    });
  });

  it('writes nothing at all when the source did not answer', () => {
    // The one that matters. An unreachable WikiSync reports no items, which is
    // indistinguishable from a member having none — persisting it would
    // overwrite six good answers with false and make the outage permanent.
    expect(
      resolveDerivedItemWrite({
        itemNames,
        sourceAnswered: false,
        sourceItems: [],
      }),
    ).toBeNull();
  });

  it('still writes nothing when a silent source happens to be believable', () => {
    // Guards against "it answered, it just said nothing" — the caller decides
    // whether the source spoke, and an empty list is never that evidence.
    expect(
      resolveDerivedItemWrite({
        itemNames,
        sourceAnswered: false,
        sourceItems: ['Quest cape'],
      }),
    ).toBeNull();
  });

  it('records a genuine negative when the source did answer', () => {
    // The mirror of the above: an answering source that reports nothing is a
    // real "they have none", and has to be stored as such or an item a member
    // has since lost would stick forever.
    expect(
      resolveDerivedItemWrite({
        itemNames,
        sourceAnswered: true,
        sourceItems: [],
      }),
    ).toEqual({
      'Quest cape': false,
      'Music cape': false,
      '6 Jads': false,
    });
  });

  it('ignores items outside the unlogged set', () => {
    // `sourceItems` is the whole derived notable-item list, most of which is
    // collection log slots that already have a home.
    expect(
      resolveDerivedItemWrite({
        itemNames: ['Quest cape'],
        sourceAnswered: true,
        sourceItems: ['Quest cape', 'Twisted bow', 'Scythe of vitur'],
      }),
    ).toEqual({ 'Quest cape': true });
  });
});
