import {
  fillOnly,
  immutable,
  keepHighest,
  keepHighestOrdinal,
  keepTrue,
  managed,
  preferFresh,
  preferResolved,
  recomputed,
  replace,
  type MergeRule,
} from './merge';

/**
 * The convention the whole design rests on. Asserted for every rule at once,
 * because a rule that treats absence as a value is the bug class this module
 * exists to remove — it is how a WikiSync outage came to unset blood torva and
 * a Temple outage came to zero clue counts.
 */
describe('every rule treats undefined as unknown', () => {
  /**
   * Erases the value type so rules over different types can sit in one table.
   * Safe here because every case only ever passes `undefined` as the incoming
   * value, which each rule must handle regardless of `T`.
   */
  const anyRule = <T>(rule: MergeRule<T>) => rule as MergeRule<unknown>;

  const rules: [string, MergeRule<unknown>, unknown][] = [
    ['immutable', anyRule(immutable<string>()), 'kept'],
    ['managed', anyRule(managed<string>()), 'kept'],
    ['recomputed', anyRule(recomputed<string>()), 'kept'],
    ['preferFresh', anyRule(preferFresh<string>()), 'kept'],
    ['replace', anyRule(replace<string>()), 'kept'],
    ['fillOnly', anyRule(fillOnly<string>()), 'kept'],
    ['keepHighest', anyRule(keepHighest()), 7],
    ['keepTrue', anyRule(keepTrue()), true],
    ['keepHighestOrdinal', anyRule(keepHighestOrdinal(['a', 'kept'])), 'kept'],
    ['preferResolved', anyRule(preferResolved<string>()), 'kept'],
  ];

  it.each(rules)('%s keeps the stored value', (_name, merge, stored) => {
    expect(merge(stored, undefined)).toEqual(stored);
  });
});

describe('immutable / managed / recomputed', () => {
  it.each([
    ['immutable', immutable<string>()],
    ['managed', managed<string>()],
    ['recomputed', recomputed<string>()],
  ])('%s ignores an incoming value entirely', (_name, merge) => {
    expect(merge('stored', 'incoming')).toBe('stored');
  });
});

describe('preferFresh', () => {
  const merge = preferFresh<number>();

  /** Temple recalculates its EHB rates, so these legitimately fall. */
  it('lets a value go down', () => {
    expect(merge(120, 90)).toBe(90);
  });

  it('accepts zero as a real value', () => {
    expect(merge(120, 0)).toBe(0);
  });
});

describe('replace', () => {
  /**
   * The proof-link bug: `if (proofLink)` meant a link could be set but never
   * cleared. Every falsy value here has to be a real choice.
   */
  it.each([null, '', false, 0])('writes %p over a stored value', (cleared) => {
    expect(replace<unknown>()('something', cleared)).toEqual(cleared);
  });
});

describe('fillOnly', () => {
  const merge = fillOnly<string | null>();

  it.each([null, undefined, ''])(
    'fills when the stored value is %p',
    (empty) => {
      expect(merge(empty as string | null, 'claimed')).toBe('claimed');
    },
  );

  it('never overwrites an owner that is already set', () => {
    expect(merge('original', 'usurper')).toBe('original');
  });
});

describe('keepHighest', () => {
  const merge = keepHighest();

  it('takes the larger value', () => {
    expect(merge(40, 55)).toBe(55);
  });

  /**
   * The Temple-outage fix: a null response used to be mapped to 0 and written
   * straight over a real count.
   */
  it('refuses to lower a count, including to zero', () => {
    expect(merge(42, 0)).toBe(42);
    expect(merge(42, 41)).toBe(42);
  });
});

describe('keepTrue', () => {
  const merge = keepTrue();

  it('latches on', () => {
    expect(merge(false, true)).toBe(true);
  });

  /**
   * A source reporting false is saying "I cannot see this", not "they don't
   * have it". A false claim is caught by the moderator diff at submission.
   */
  it('never unsets a claim', () => {
    expect(merge(true, false)).toBe(true);
  });
});

describe('keepHighestOrdinal', () => {
  const merge = keepHighestOrdinal(['None', 'Fire cape', 'Infernal cape']);

  it('promotes to a higher rank', () => {
    expect(merge('Fire cape', 'Infernal cape')).toBe('Infernal cape');
  });

  it('refuses to demote', () => {
    expect(merge('Infernal cape', 'Fire cape')).toBe('Infernal cape');
    expect(merge('Infernal cape', 'None')).toBe('Infernal cape');
  });

  it('keeps equal values stable', () => {
    expect(merge('Fire cape', 'Fire cape')).toBe('Fire cape');
  });

  /**
   * An unranked stored value should still yield to something recognised,
   * rather than pinning the column forever.
   */
  it('treats a value outside the ranking as lowest', () => {
    expect(merge('Nonsense cape', 'Fire cape')).toBe('Fire cape');
    expect(merge('Fire cape', 'Nonsense cape')).toBe('Fire cape');
  });
});

describe('preferResolved', () => {
  const merge = preferResolved<string>();

  it('takes a resolution', () => {
    expect(merge(null, 'ironman')).toBe('ironman');
    expect(merge('ironman', 'hardcore_ironman')).toBe('hardcore_ironman');
  });

  /**
   * Temple reports null both for a real main and for a group ironman it has
   * never heard of, so null is the absence of an answer — it must never erase
   * an answer already given.
   */
  it('never erases a stored answer with null', () => {
    expect(merge('group_ironman', null)).toBe('group_ironman');
  });

  it('leaves an unresolved account unresolved', () => {
    expect(merge(null, null)).toBeNull();
  });
});
