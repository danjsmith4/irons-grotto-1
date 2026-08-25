import {
  botwBosses,
  clanEventMetrics,
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
  it('covers all 23 skills', () => {
    expect(sotwSkills).toHaveLength(23);
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
