import { diffItemOverrides } from './item-override-operations';

describe('diffItemOverrides', () => {
  it('stores a claim no source accounts for', () => {
    expect(
      diffItemOverrides({
        derived: [],
        submitted: { 'Dragon defender': true },
      }),
    ).toEqual([{ itemName: 'Dragon defender', isAcquired: true }]);
  });

  /**
   * Not simply a list of claimed items: unticking something a source *does*
   * report is also an answer, and has to survive the next sync.
   */
  it('stores an explicit untick of something a source reports', () => {
    expect(
      diffItemOverrides({
        derived: ['Abyssal whip'],
        submitted: {},
      }),
    ).toEqual([{ itemName: 'Abyssal whip', isAcquired: false }]);
  });

  it('stores nothing when the sources already agree', () => {
    expect(
      diffItemOverrides({
        derived: ['Abyssal whip'],
        submitted: { 'Abyssal whip': true },
      }),
    ).toEqual([]);
  });

  it('stores nothing for an item nobody mentions', () => {
    expect(diffItemOverrides({ derived: [], submitted: {} })).toEqual([]);
  });

  /**
   * The self-healing property, and the reason the table stays small: once
   * Temple catches up on a claimed item, the disagreement disappears and the
   * row goes with it — which also shrinks the moderator's submission diff
   * without anyone doing anything.
   */
  it('drops a claim once a source catches up with it', () => {
    const claimed = { 'Tumeken’s guardian': true };

    expect(diffItemOverrides({ derived: [], submitted: claimed })).toHaveLength(
      1,
    );
    expect(
      diffItemOverrides({
        derived: ['Tumeken’s guardian'],
        submitted: claimed,
      }),
    ).toEqual([]);
  });

  it('handles a mixed sheet', () => {
    const overrides = diffItemOverrides({
      derived: ['Abyssal whip', 'Bandos chestplate'],
      submitted: { 'Abyssal whip': true, 'Dragon defender': true },
    });

    expect(overrides).toEqual(
      expect.arrayContaining([
        // Claimed, unexplained.
        { itemName: 'Dragon defender', isAcquired: true },
        // Reported by a source, unticked by the player.
        { itemName: 'Bandos chestplate', isAcquired: false },
      ]),
    );
    // 'Abyssal whip' is agreed on, so it is not stored.
    expect(overrides).toHaveLength(2);
  });

  it('is stable when run twice over the same sheet', () => {
    const input = {
      derived: ['Abyssal whip'],
      submitted: { 'Dragon defender': true },
    };

    expect(diffItemOverrides(input)).toEqual(diffItemOverrides(input));
  });
});
