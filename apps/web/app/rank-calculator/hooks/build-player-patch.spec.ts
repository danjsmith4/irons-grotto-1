import { buildPlayerPatch } from './use-autosave';

const committed = {
  playerName: 'Iron Wispy',
  proofLink: 'https://example.com/proof',
  hasRadiantOathplate: false,
  hasBloodTorva: false,
  combatAchievementTier: 'Hard' as const,
  tzhaarCape: 'Fire cape' as const,
  acquiredItems: { 'Abyssal whip': true },
  achievementDiaries: { Morytania: 'Elite' as const },
  ehb: 500,
  totalLevel: 2000,
};

type Values = Parameters<typeof buildPlayerPatch>[0];

describe('buildPlayerPatch', () => {
  it('sends nothing when nothing changed', () => {
    expect(
      buildPlayerPatch(committed as Values, committed as Values),
    ).toBeNull();
  });

  it('sends only the field that changed', () => {
    expect(
      buildPlayerPatch(
        { ...committed, hasRadiantOathplate: true } as Values,
        committed as Values,
      ),
    ).toEqual({ hasRadiantOathplate: true });
  });

  /**
   * The whole reason autosave replaced the draft save: that took the entire
   * form every time, which is why every page load rewrote every field.
   */
  it('never sends a field the player does not own', () => {
    const patch = buildPlayerPatch(
      { ...committed, ehb: 9999, totalLevel: 2376 } as Values,
      committed as Values,
    );

    expect(patch).toBeNull();
  });

  it('still sends owned fields when unowned ones also moved', () => {
    expect(
      buildPlayerPatch(
        { ...committed, ehb: 9999, proofLink: null } as unknown as Values,
        committed as Values,
      ),
    ).toEqual({ proofLink: null });
  });

  /**
   * react-hook-form replaces these objects wholesale on every edit, so an
   * identity check would report a change on every keystroke.
   */
  it('compares object fields structurally, not by identity', () => {
    expect(
      buildPlayerPatch(
        { ...committed, acquiredItems: { 'Abyssal whip': true } } as Values,
        committed as Values,
      ),
    ).toBeNull();

    expect(
      buildPlayerPatch(
        {
          ...committed,
          acquiredItems: { 'Abyssal whip': true, 'Dragon defender': true },
        } as Values,
        committed as Values,
      ),
    ).toEqual({
      acquiredItems: { 'Abyssal whip': true, 'Dragon defender': true },
    });
  });

  it('sends a cleared proof link, which is a value and not an absence', () => {
    expect(
      buildPlayerPatch(
        { ...committed, proofLink: '' } as Values,
        committed as Values,
      ),
    ).toEqual({ proofLink: '' });
  });

  it('sends several changed fields together', () => {
    expect(
      buildPlayerPatch(
        {
          ...committed,
          hasBloodTorva: true,
          combatAchievementTier: 'Master',
        } as Values,
        committed as Values,
      ),
    ).toEqual({ hasBloodTorva: true, combatAchievementTier: 'Master' });
  });
});
