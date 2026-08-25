import {
  parseTempleUtcDate,
  TempleCompetitionCreateResponse,
  TempleCompetitionResponse,
  TempleErrorResponse,
} from './clan-events';

describe('parseTempleUtcDate', () => {
  /**
   * The whole reason this function exists: Temple sends `YYYY-MM-DD HH:MM:SS`
   * with no zone, its server runs on UTC, and V8 reads that form as *local*
   * time — which would shift every event by the host's offset.
   */
  it('reads a zone-less Temple date as UTC', () => {
    expect(parseTempleUtcDate('2026-08-21 14:00:00').toISOString()).toBe(
      '2026-08-21T14:00:00.000Z',
    );
  });
});

describe('TempleCompetitionResponse', () => {
  const payload = {
    data: {
      info: {
        id: 38852,
        name: 'Thieving Sotw',
        team_competition: false,
        participant_count: 278,
        skill: 'Thieving',
        skill_index: 18,
        start_date: '2026-08-21 14:00:00',
        end_date: '2026-08-28 10:00:00',
        status: 1,
        status_text: 'In progress',
        linked_group_id: 241,
        group_member_sync: 1,
      },
      participants: [
        {
          username: 'Milkyschmuck',
          xp_gained: 2159181,
          start_level: 84,
          current_level: 89,
          last_checked: '2026-08-25 03:49:51',
        },
      ],
    },
  };

  it('parses a live standings payload', () => {
    const { data } = TempleCompetitionResponse.parse(payload);

    expect(data.info.start_date.toISOString()).toBe('2026-08-21T14:00:00.000Z');
    expect(data.info.skill_index).toBe(18);
  });

  /** Boss weeks report kill count through the same `xp_gained` field. */
  it('renames xp_gained to the metric-neutral "gained"', () => {
    const { data } = TempleCompetitionResponse.parse(payload);

    expect(data.participants[0]).toMatchObject({
      username: 'Milkyschmuck',
      gained: 2159181,
    });
  });
});

describe('TempleCompetitionCreateResponse', () => {
  it('accepts a wrapped reply', () => {
    expect(
      TempleCompetitionCreateResponse.parse({
        data: { id: 12345, name: 'Zulrah BOTW', key: 'abc123' },
      }),
    ).toMatchObject({ id: 12345, key: 'abc123' });
  });

  it('accepts an unwrapped reply', () => {
    expect(
      TempleCompetitionCreateResponse.parse({ id: 12345, key: 'abc123' }),
    ).toMatchObject({ id: 12345, key: 'abc123' });
  });

  /**
   * Temple hands the edit key out once. A reply without one is still a
   * successful creation — just one we can no longer edit — so it must parse.
   */
  it('parses without a key', () => {
    const parsed = TempleCompetitionCreateResponse.parse({ id: 12345 });

    expect(parsed.id).toBe(12345);
    expect(parsed.key).toBeUndefined();
  });
});

describe('TempleErrorResponse', () => {
  /** Temple answers its own errors with a 200 and this envelope. */
  it('recognises the error envelope', () => {
    const result = TempleErrorResponse.safeParse({
      error: { Code: 402, Message: 'Group not found in database' },
    });

    expect(result.success).toBe(true);
  });

  it('does not swallow a successful payload', () => {
    expect(TempleErrorResponse.safeParse({ data: { id: 1 } }).success).toBe(
      false,
    );
  });
});
