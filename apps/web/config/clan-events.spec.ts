import {
  botwBosses,
  clanEventMetrics,
  combatSkillMetricIds,
  clanEventTypeForMetric,
  clanEventTypes,
  defaultClanEventName,
  findClanEventMetric,
  nextClanEventType,
  sotwSkills,
} from './clan-events';

describe('nextClanEventType', () => {
  it('alternates', () => {
    expect(nextClanEventType('sotw')).toBe('botw');
    expect(nextClanEventType('botw')).toBe('sotw');
  });

  it('starts at a skill week when nothing is recorded', () => {
    expect(nextClanEventType(null)).toBe('sotw');
  });

  it('never repeats itself', () => {
    expect(nextClanEventType(nextClanEventType('sotw'))).toBe('sotw');
  });
});

describe('metric lists', () => {
  /**
   * Combat is what Boss of the Week is for, and Hitpoints cannot be trained on
   * its own at all — so the six combat skills are not offered.
   */
  it('offers no combat skill', () => {
    const offered = sotwSkills.filter(({ id }) =>
      combatSkillMetricIds.includes(id),
    );

    expect(offered).toEqual([]);
  });

  it.each(['Attack', 'Strength', 'Defence', 'Ranged', 'Magic', 'Hitpoints'])(
    'does not offer %s',
    (name) => {
      expect(sotwSkills.map((skill) => skill.name)).not.toContain(name);
    },
  );

  it('offers the non-combat skills', () => {
    expect(sotwSkills.map(({ name }) => name)).toEqual(
      expect.arrayContaining([
        'Agility',
        'Farming',
        'Runecraft',
        'Slayer',
        'Thieving',
        'Woodcutting',
      ]),
    );
  });

  /**
   * The metric of the first BOTW backfilled. It was missing at first, which
   * left that event with no icon and made it un-importable through the UI —
   * `clanEventTypeForMetric` could not classify it.
   */
  it('covers the newer bosses Temple lists', () => {
    expect(botwBosses.map(({ name }) => name)).toEqual(
      expect.arrayContaining([
        'Maggot King',
        'Brutus',
        'Mad Angel',
        'Shellbane Gryphon',
      ]),
    );
  });

  /**
   * Temple's `skill` parameter is an id, and a duplicate would silently make
   * one of two entries unreachable from `findClanEventMetric`.
   */
  it.each(clanEventTypes)('has unique metric ids for %s', (type) => {
    const ids = clanEventMetrics[type].map(({ id }) => id);

    expect(new Set(ids).size).toBe(ids.length);
  });

  /**
   * Skills and bosses share one id space on Temple, which is what lets an
   * imported competition be classified from its metric alone.
   */
  it('never uses the same id for a skill and a boss', () => {
    const skillIds = new Set(sotwSkills.map(({ id }) => id));

    expect(botwBosses.filter(({ id }) => skillIds.has(id))).toEqual([]);
  });

  it('gives every metric an icon', () => {
    expect([...sotwSkills, ...botwBosses].filter(({ icon }) => !icon)).toEqual(
      [],
    );
  });
});

describe('clanEventTypeForMetric', () => {
  it('classifies a skill', () => {
    expect(clanEventTypeForMetric(18)).toBe('sotw');
  });

  it('classifies a boss', () => {
    expect(clanEventTypeForMetric(75)).toBe('botw');
  });

  it('refuses anything it does not model', () => {
    // 24 is Temple's EHP, which is neither a skill week nor a boss week.
    expect(clanEventTypeForMetric(24)).toBeNull();
  });
});

describe('findClanEventMetric', () => {
  it('finds within the right type only', () => {
    expect(findClanEventMetric('sotw', 18)?.name).toBe('Thieving');
    expect(findClanEventMetric('botw', 18)).toBeNull();
  });
});

describe('defaultClanEventName', () => {
  it('matches the naming already used on Temple', () => {
    expect(defaultClanEventName('sotw', 'Thieving')).toBe('Thieving SOTW');
    expect(defaultClanEventName('botw', 'Zulrah')).toBe('Zulrah BOTW');
  });
});
