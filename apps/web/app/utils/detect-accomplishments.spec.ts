import { maximumTotalLevel } from '@/app/schemas/osrs';
import { milestoneThresholds } from '@/config/accomplishments';
import {
  AccomplishmentSnapshot,
  detectAccomplishments,
  eliteDiaryLocationsFrom,
} from './detect-accomplishments';

const emptySnapshot: AccomplishmentSnapshot = {
  collectionLogCount: 0,
  totalLevel: 0,
  ehb: 0,
  ehp: 0,
  combatAchievementTier: 'None',
  tzhaarCape: 'None',
  hasBloodTorva: false,
  hasRadiantOathplate: false,
  hasDizanasQuiver: false,
  hasAchievementDiaryCape: false,
  eliteDiaryLocations: [],
  acquiredItems: [],
};

function keysOf(snapshot: Partial<AccomplishmentSnapshot>) {
  return detectAccomplishments({ ...emptySnapshot, ...snapshot }).map(
    ({ key }) => key,
  );
}

describe('detectAccomplishments', () => {
  it('finds nothing for a fresh account', () => {
    expect(detectAccomplishments(emptySnapshot)).toEqual([]);
  });

  /**
   * The detector reports what a player *currently* qualifies for rather than
   * what is new, so someone who arrives past several thresholds earns all of
   * them. The unique key in the database is what stops them being announced
   * twice — see `syncPlayerAccomplishments`.
   */
  it('awards every threshold reached, not just the highest', () => {
    expect(keysOf({ collectionLogCount: 1100 })).toEqual([
      'collection_log:100',
      'collection_log:250',
      'collection_log:500',
      'collection_log:750',
      'collection_log:1000',
    ]);
  });

  it('withholds a threshold that has not been reached', () => {
    expect(keysOf({ collectionLogCount: 99 })).toEqual([]);
  });

  it('awards a threshold on the exact boundary', () => {
    expect(keysOf({ collectionLogCount: 100 })).toEqual(['collection_log:100']);
  });

  it.each(['ehb', 'ehp'] as const)(
    'measures %s against its own ladder',
    (type) => {
      const [firstThreshold] = milestoneThresholds[type];

      expect(keysOf({ [type]: firstThreshold })).toEqual([
        `${type}:${firstThreshold}`,
      ]);
    },
  );

  it('labels a milestone with its threshold, not the current value', () => {
    const [milestone] = detectAccomplishments({
      ...emptySnapshot,
      collectionLogCount: 1100,
    });

    expect(milestone.label).toBe('100 collection log slots');
    expect(milestone.value).toBe(100);
  });

  it('recognises a maxed account on top of the total level ladder', () => {
    expect(keysOf({ totalLevel: maximumTotalLevel })).toContain('maxed');
  });

  it('does not call an unmaxed account maxed', () => {
    expect(keysOf({ totalLevel: maximumTotalLevel - 1 })).not.toContain(
      'maxed',
    );
  });

  /**
   * Grandmaster implies Master, and both are worth announcing — the same rule
   * as the milestone ladders.
   */
  it('awards every notable combat achievement tier up to the one reached', () => {
    expect(keysOf({ combatAchievementTier: 'Grandmaster' })).toEqual([
      'combat_achievement:Master',
      'combat_achievement:Grandmaster',
    ]);
  });

  it('stops at the tier actually reached', () => {
    expect(keysOf({ combatAchievementTier: 'Master' })).toEqual([
      'combat_achievement:Master',
    ]);
  });

  it.each(['None', 'Easy', 'Medium', 'Hard', 'Elite'])(
    'ignores the %s combat achievement tier',
    (combatAchievementTier) => {
      expect(keysOf({ combatAchievementTier })).toEqual([]);
    },
  );

  it('awards an elite diary per region', () => {
    expect(keysOf({ eliteDiaryLocations: ['Morytania', 'Karamja'] })).toEqual([
      'elite_diary:Morytania',
      'elite_diary:Karamja',
    ]);
  });

  it('reads the Inferno off the infernal cape', () => {
    expect(keysOf({ tzhaarCape: 'Infernal cape' })).toEqual(['inferno']);
  });

  it('does not read the Inferno off a fire cape', () => {
    expect(keysOf({ tzhaarCape: 'Fire cape' })).toEqual([]);
  });

  it.each([
    ['hasDizanasQuiver', 'colosseum'],
    ['hasBloodTorva', 'blood_torva'],
    ['hasRadiantOathplate', 'radiant_oathplate'],
    ['hasAchievementDiaryCape', 'diary_cape'],
  ] as const)('reads %s as %s', (flag, key) => {
    expect(keysOf({ [flag]: true })).toEqual([key]);
  });

  describe('items', () => {
    const petSnakeling = {
      itemId: 12921,
      itemName: 'Pet snakeling',
      dateFirstLogged: new Date('2024-03-01T00:00:00.000Z'),
    };

    it('awards a pet, and lets it carry its own icon', () => {
      const [pet] = detectAccomplishments({
        ...emptySnapshot,
        acquiredItems: [petSnakeling],
      });

      expect(pet).toEqual({
        type: 'pet',
        key: 'pet:12921',
        label: 'Pet snakeling',
        value: null,
        iconItemName: 'Pet snakeling',
        achievedAt: petSnakeling.dateFirstLogged,
      });
    });

    it('ignores an item that is not a pet', () => {
      expect(
        keysOf({
          acquiredItems: [
            {
              itemId: 4151,
              itemName: 'Abyssal whip',
              dateFirstLogged: new Date(),
            },
          ],
        }),
      ).toEqual([]);
    });

    /**
     * The cursed phalanx is only obtainable at 500+ invocation, so the clog
     * entry is the proof of the raid level.
     */
    it('reads a 500 invocation Tombs run off the cursed phalanx', () => {
      const dateFirstLogged = new Date('2025-01-02T00:00:00.000Z');

      const [phalanx] = detectAccomplishments({
        ...emptySnapshot,
        acquiredItems: [
          { itemId: 27377, itemName: 'Cursed phalanx', dateFirstLogged },
        ],
      });

      expect(phalanx.key).toBe('toa_cursed_phalanx');
      expect(phalanx.achievedAt).toBe(dateFirstLogged);
    });

    /**
     * The collection log is the only source that knows when something happened.
     * Everything else is dated by the caller from the time of the run.
     */
    it('leaves the date open for accomplishments nothing can date', () => {
      const [milestone] = detectAccomplishments({
        ...emptySnapshot,
        collectionLogCount: 100,
      });

      expect(milestone.achievedAt).toBeNull();
    });
  });

  /**
   * Every row goes into one insert keyed on `(player_name, accomplishment_key)`,
   * so a key repeated inside a single detection would be a bug that only shows
   * up against a live database.
   */
  it('never repeats a key within one detection', () => {
    const keys = detectAccomplishments({
      collectionLogCount: 1800,
      totalLevel: maximumTotalLevel,
      ehb: 3000,
      ehp: 3000,
      combatAchievementTier: 'Grandmaster',
      tzhaarCape: 'Infernal cape',
      hasBloodTorva: true,
      hasRadiantOathplate: true,
      hasDizanasQuiver: true,
      hasAchievementDiaryCape: true,
      eliteDiaryLocations: ['Morytania', 'Karamja'],
      acquiredItems: [
        {
          itemId: 12921,
          itemName: 'Pet snakeling',
          dateFirstLogged: new Date(),
        },
        {
          itemId: 27377,
          itemName: 'Cursed phalanx',
          dateFirstLogged: new Date(),
        },
      ],
    }).map(({ key }) => key);

    expect(new Set(keys).size).toBe(keys.length);
  });

  it('is stable across runs, so nothing is re-announced under a new key', () => {
    const snapshot = { ...emptySnapshot, collectionLogCount: 600 };

    expect(keysOf(snapshot)).toEqual(keysOf(snapshot));
  });
});

describe('eliteDiaryLocationsFrom', () => {
  /**
   * Each diary row holds the player's *highest* tier for the region, so an
   * Elite row is a finished Elite diary and anything below it is not.
   */
  it('keeps only completed elite diaries', () => {
    expect(
      eliteDiaryLocationsFrom([
        { location: 'Morytania', tier: 'Elite', completed: true },
        { location: 'Karamja', tier: 'Hard', completed: true },
        { location: 'Varrock', tier: 'Elite', completed: false },
        { location: 'Desert', tier: 'None', completed: false },
      ]),
    ).toEqual(['Morytania']);
  });
});
