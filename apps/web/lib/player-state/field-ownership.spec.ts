import { getTableColumns } from 'drizzle-orm';
import { players } from '@/lib/db/schema';
import { CombatAchievementTier, TzHaarCape } from '@/app/schemas/osrs';
import {
  canWrite,
  fieldOwnership,
  fieldsWritableBy,
  originsByOwner,
  type FieldOwner,
  type WriteOrigin,
} from './field-ownership';

const owners = Object.keys(originsByOwner) as FieldOwner[];

describe('the table covers the players table exactly', () => {
  /**
   * The check that actually holds the line. Adding a column to `schema.ts`
   * fails this until someone decides who owns it — which is the whole point,
   * because the alternative is what happened before: an unclassified column
   * gets whatever behaviour the nearest write path happens to give it.
   *
   * The mapped type in `field-ownership.ts` says the same thing at compile
   * time, but a type error is one `as` away from being silenced and a red test
   * is not.
   */
  it('classifies every column, and invents none', () => {
    expect(Object.keys(fieldOwnership).sort()).toEqual(
      Object.keys(getTableColumns(players)).sort(),
    );
  });

  it('gives every column an owner and a merge rule', () => {
    Object.entries(fieldOwnership).forEach(([field, rule]) => {
      expect(owners).toContain(rule.owner);
      expect(typeof rule.merge).toBe('function');
      // Named in the failure message so a new column says which one it is.
      expect({ field, hasRule: typeof rule.merge }).toEqual({
        field,
        hasRule: 'function',
      });
    });
  });
});

describe('write permissions', () => {
  it('lets a source write source and contested columns, and nothing else', () => {
    expect(canWrite('source', 'source')).toBe(true);
    expect(canWrite('contested', 'source')).toBe(true);
    expect(canWrite('player', 'source')).toBe(false);
    expect(canWrite('staff', 'source')).toBe(false);
  });

  /**
   * The calculator form is `origin: 'player'`. It must not be able to assert a
   * stat, a rank, or a staff role — the first would let someone type their own
   * EHB, the last two would be privilege escalation.
   */
  it('lets a player write player and contested columns, and nothing else', () => {
    expect(canWrite('player', 'player')).toBe(true);
    expect(canWrite('contested', 'player')).toBe(true);
    expect(canWrite('source', 'player')).toBe(false);
    expect(canWrite('staff', 'player')).toBe(false);
    expect(canWrite('identity', 'player')).toBe(false);
    expect(canWrite('system', 'player')).toBe(false);
  });

  it.each(['source', 'player', 'staff', 'system'] as WriteOrigin[])(
    'never accepts a derived column from %s',
    (origin) => {
      expect(canWrite('derived', origin)).toBe(false);
    },
  );

  it('keeps the player out of every stat column', () => {
    const playerWritable = fieldsWritableBy('player');

    expect(playerWritable).not.toContain('ehb');
    expect(playerWritable).not.toContain('ehp');
    expect(playerWritable).not.toContain('totalLevel');
    expect(playerWritable).not.toContain('collectionLogCount');
    expect(playerWritable).not.toContain('clueCountMaster');
    expect(playerWritable).not.toContain('points');
    expect(playerWritable).not.toContain('rank');
    expect(playerWritable).not.toContain('staffRole');
  });

  it('gives the player the claims nothing else can confirm', () => {
    expect(fieldsWritableBy('player')).toEqual(
      expect.arrayContaining([
        'hasRadiantOathplate',
        'proofLink',
        'hasBloodTorva',
        'combatAchievementTier',
      ]),
    );
  });

  /**
   * A source going quiet is the failure mode this whole module was written for,
   * so it must never be able to reach into the player's own claims.
   */
  it('keeps a source out of the player-only claims', () => {
    const sourceWritable = fieldsWritableBy('source');

    expect(sourceWritable).not.toContain('hasRadiantOathplate');
    expect(sourceWritable).not.toContain('proofLink');
    expect(sourceWritable).not.toContain('rank');
  });
});

describe('the merge rules behave as the table promises', () => {
  it('will not let a quiet source unset blood torva or the quiver', () => {
    expect(fieldOwnership.hasBloodTorva.merge(true, undefined)).toBe(true);
    expect(fieldOwnership.hasBloodTorva.merge(true, false)).toBe(true);
    expect(fieldOwnership.hasDizanasQuiver.merge(true, false)).toBe(true);
  });

  it('will not let a quiet source zero a clue count', () => {
    expect(fieldOwnership.clueCountMaster.merge(42, 0)).toBe(42);
    expect(fieldOwnership.clueCountMaster.merge(42, undefined)).toBe(42);
  });

  it('lets a player clear their proof link', () => {
    expect(
      fieldOwnership.proofLink.merge('https://example.com', null),
    ).toBeNull();
    expect(fieldOwnership.proofLink.merge('https://example.com', '')).toBe('');
  });

  it('lets a player untick radiant oathplate', () => {
    expect(fieldOwnership.hasRadiantOathplate.merge(true, false)).toBe(false);
  });

  it('never demotes a cape or a combat achievement tier', () => {
    expect(fieldOwnership.tzhaarCape.merge('Infernal cape', 'Fire cape')).toBe(
      'Infernal cape',
    );
    expect(
      fieldOwnership.combatAchievementTier.merge('Grandmaster', 'Hard'),
    ).toBe('Grandmaster');
  });

  it('promotes a cape or tier when the source is ahead', () => {
    expect(fieldOwnership.tzhaarCape.merge('None', 'Infernal cape')).toBe(
      'Infernal cape',
    );
    expect(fieldOwnership.combatAchievementTier.merge('Hard', 'Master')).toBe(
      'Master',
    );
  });

  /** Temple wins when it resolves; a null resolution is not an answer. */
  it('lets Temple resolve account type but not erase it', () => {
    expect(fieldOwnership.accountType.merge(null, 'ironman')).toBe('ironman');
    expect(fieldOwnership.accountType.merge('group_ironman', null)).toBe(
      'group_ironman',
    );
  });

  it('lets EHB fall when Temple recalculates its rates', () => {
    expect(fieldOwnership.ehb.merge(1200, 900)).toBe(900);
  });

  it('never lets a patch set a derived column', () => {
    expect(fieldOwnership.points.merge(5000, 9999)).toBe(5000);
    expect(fieldOwnership.hasAchievementDiaryCape.merge(false, true)).toBe(
      false,
    );
  });
});

/**
 * The ordered enums are ranked by an explicit list rather than their zod
 * declaration order, so the two can drift apart. These catch that: add a cape
 * or a tier and the ranking has to be updated before the merge rule can be
 * trusted.
 */
describe('the ordinal rankings stay exhaustive', () => {
  it('ranks every TzHaar cape', () => {
    TzHaarCape.options.forEach((cape) => {
      // A cape missing from the ranking merges as "lowest", which would
      // silently make it unreachable.
      expect(fieldOwnership.tzhaarCape.merge('None', cape)).toBe(
        cape === 'None' ? 'None' : cape,
      );
    });
  });

  it('ranks every combat achievement tier', () => {
    CombatAchievementTier.options.forEach((tier) => {
      expect(fieldOwnership.combatAchievementTier.merge('None', tier)).toBe(
        tier === 'None' ? 'None' : tier,
      );
    });
  });
});
