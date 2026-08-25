import { achievementDefinitions } from '../scan-types';
import { resolveEarnedAchievements } from './resolve-earned-achievements';

const allSources = {
  temple: { hasInfernal: true, isMaxed: true },
  collectionLog: { hasFangKit: true },
  achievements: { hasBlorva: true, hasQuiver: true, hasZukHelm: true },
};

const everythingRevealed = new Set([
  'temple',
  'collectionLog',
  'achievements',
]);

describe('resolveEarnedAchievements', () => {
  it('earns everything a fully-decorated account holds', () => {
    expect([
      ...resolveEarnedAchievements(allSources, everythingRevealed),
    ].sort()).toEqual(
      ['blorva', 'fangKit', 'infernal', 'maxed', 'quiver', 'zukHelm'].sort(),
    );
  });

  it('earns nothing before any source has been revealed', () => {
    expect(resolveEarnedAchievements(allSources, new Set()).size).toBe(0);
  });

  it('reveals a source at a time, in the order the scan runs', () => {
    const afterTemple = resolveEarnedAchievements(
      allSources,
      new Set(['temple']),
    );

    expect([...afterTemple].sort()).toEqual(['infernal', 'maxed']);

    const afterCollectionLog = resolveEarnedAchievements(
      allSources,
      new Set(['temple', 'collectionLog']),
    );

    expect([...afterCollectionLog].sort()).toEqual([
      'fangKit',
      'infernal',
      'maxed',
    ]);
  });

  it('holds back an achievement whose source has not had its turn', () => {
    // Blood Torva is settled by WikiSync. Even with the answer in hand, it must
    // not light up until the combat-achievement step is revealed, or the
    // sequence stops meaning anything.
    const earned = resolveEarnedAchievements(
      allSources,
      new Set(['temple', 'collectionLog']),
    );

    expect(earned.has('blorva')).toBe(false);
  });

  it('earns nothing from a source that answered with no data', () => {
    const earned = resolveEarnedAchievements(
      { temple: null, collectionLog: null, achievements: null },
      everythingRevealed,
    );

    expect(earned.size).toBe(0);
  });

  it('earns only what the player actually has', () => {
    const earned = resolveEarnedAchievements(
      {
        temple: { hasInfernal: true, isMaxed: false },
        collectionLog: { hasFangKit: false },
        achievements: {
          hasBlorva: false,
          hasQuiver: true,
          hasZukHelm: false,
        },
      },
      everythingRevealed,
    );

    expect([...earned].sort()).toEqual(['infernal', 'quiver']);
  });

  it('never offers Radiant Oathplate, which no source reports', () => {
    // Radiant is a claim the player ticks in the calculator — there is nothing
    // to scan for. If it ever appears here, something has been added to the
    // wall that cannot be settled and will always render as absent.
    expect(achievementDefinitions.map(({ key }) => key)).not.toContain(
      'radiant',
    );
  });
});
