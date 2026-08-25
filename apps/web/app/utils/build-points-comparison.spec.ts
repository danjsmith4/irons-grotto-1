import type {
  PointsBreakdown,
  PointsBreakdownLine,
} from '@/app/player/utils/build-points-breakdown';
import {
  buildPointsComparison,
  splitRowsByDirection,
} from './build-points-comparison';

function breakdown(lines: Partial<PointsBreakdownLine>[]): PointsBreakdown {
  const filled = lines.map((line, index) => ({
    key: line.key ?? `line-${index}`,
    label: line.label ?? `Line ${index}`,
    category: line.category ?? ('combat' as const),
    points: line.points ?? 0,
    detail: line.detail,
    image: line.image,
  }));

  return {
    totalPoints: filled.reduce((total, { points }) => total + points, 0),
    categories: [
      { key: 'combat', label: 'Combat', points: 0 },
      { key: 'skilling', label: 'Skilling', points: 0 },
      { key: 'collectionLog', label: 'Collection log & clues', points: 0 },
      { key: 'notableItems', label: 'Notable items', points: 0 },
    ],
    lines: filled,
  };
}

function side(
  playerName: string,
  lines: Partial<PointsBreakdownLine>[],
  storedPoints = 0,
) {
  const built = breakdown(lines);

  return {
    playerName,
    rank: 'corporal',
    storedPoints,
    breakdownPoints: built.totalPoints,
    breakdown: built,
  };
}

describe('buildPointsComparison', () => {
  it('signs every delta from the subject, so one axis reads the whole list', () => {
    const comparison = buildPointsComparison(
      side('Them', [
        { key: 'a', points: 300 },
        { key: 'b', points: 10 },
      ]),
      side('You', [
        { key: 'a', points: 100 },
        { key: 'b', points: 60 },
      ]),
    );

    expect(comparison.rows.map(({ key, delta }) => [key, delta])).toEqual([
      ['a', 200],
      ['b', -50],
    ]);
  });

  it('orders rows by how much work they do, regardless of direction', () => {
    const comparison = buildPointsComparison(
      side('Them', [
        { key: 'small', points: 10 },
        { key: 'big', points: 0 },
        { key: 'medium', points: 40 },
      ]),
      side('You', [
        { key: 'small', points: 0 },
        { key: 'big', points: 500 },
        { key: 'medium', points: 0 },
      ]),
    );

    expect(comparison.rows.map(({ key }) => key)).toEqual([
      'big',
      'medium',
      'small',
    ]);
  });

  it('keeps a line only one of them has, with the other at zero', () => {
    const comparison = buildPointsComparison(
      side('Them', [
        { key: 'notable-item:Scythe', label: 'Scythe of vitur', points: 900 },
      ]),
      side('You', []),
    );

    expect(comparison.rows).toHaveLength(1);
    expect(comparison.rows[0]).toMatchObject({
      label: 'Scythe of vitur',
      subject: { points: 900 },
      viewer: { points: 0 },
      delta: 900,
    });
  });

  it('takes the label from whichever side knows the line', () => {
    // The subject may have nothing to say about an item only the viewer owns,
    // so the row has to be describable from either end.
    const comparison = buildPointsComparison(
      side('Them', []),
      side('You', [{ key: 'notable-item:Tbow', label: 'Twisted bow', points: 800 }]),
    );

    expect(comparison.rows[0].label).toBe('Twisted bow');
  });

  it('drops lines the two agree on', () => {
    const comparison = buildPointsComparison(
      side('Them', [
        { key: 'same', points: 250 },
        { key: 'different', points: 30 },
      ]),
      side('You', [
        { key: 'same', points: 250 },
        { key: 'different', points: 0 },
      ]),
    );

    expect(comparison.rows.map(({ key }) => key)).toEqual(['different']);
  });

  it('reports the gap from the stored totals, not the ledger', () => {
    // The leaderboard's number is the one being explained. The ledger can fall
    // a little short of it, and the headline must not drift with it.
    const comparison = buildPointsComparison(
      side('Them', [{ key: 'a', points: 100 }], 1200),
      side('You', [{ key: 'a', points: 50 }], 900),
    );

    expect(comparison.totalDelta).toBe(300);
  });

  it('scales bars against the largest difference in the list', () => {
    const comparison = buildPointsComparison(
      side('Them', [
        { key: 'a', points: 400 },
        { key: 'b', points: 0 },
      ]),
      side('You', [
        { key: 'a', points: 0 },
        { key: 'b', points: 90 },
      ]),
    );

    expect(comparison.largestDelta).toBe(400);
  });

  it('always reports all four categories, biggest swing first', () => {
    const them = side('Them', []);
    const you = side('You', []);

    them.breakdown.categories = [
      { key: 'combat', label: 'Combat', points: 100 },
      { key: 'skilling', label: 'Skilling', points: 100 },
      { key: 'collectionLog', label: 'Collection log & clues', points: 700 },
      { key: 'notableItems', label: 'Notable items', points: 100 },
    ];
    you.breakdown.categories = [
      { key: 'combat', label: 'Combat', points: 400 },
      { key: 'skilling', label: 'Skilling', points: 100 },
      { key: 'collectionLog', label: 'Collection log & clues', points: 100 },
      { key: 'notableItems', label: 'Notable items', points: 100 },
    ];

    const comparison = buildPointsComparison(them, you);

    expect(comparison.categories.map(({ key, delta }) => [key, delta])).toEqual(
      [
        ['collectionLog', 600],
        ['combat', -300],
        ['notableItems', 0],
        ['skilling', 0],
      ],
    );
  });
});

describe('splitRowsByDirection', () => {
  const mixed = () =>
    buildPointsComparison(
      side(
        'Them',
        [
          { key: 'boss', points: 900 },
          { key: 'skill', points: 0 },
          { key: 'clue', points: 40 },
        ],
        5000,
      ),
      side(
        'You',
        [
          { key: 'boss', points: 100 },
          { key: 'skill', points: 300 },
          { key: 'clue', points: 0 },
        ],
        1000,
      ),
    );

  it('leads with the rows explaining the gap, not against it', () => {
    const { subjectLeads, leading, trailing } = splitRowsByDirection(mixed());

    expect(subjectLeads).toBe(true);
    expect(leading.map(({ key }) => key)).toEqual(['boss', 'clue']);
    expect(trailing.map(({ key }) => key)).toEqual(['skill']);
  });

  it('flips when the viewer is the one ahead', () => {
    // Same rows, but the stored totals put the viewer in front — so the rows
    // that now need explaining are the ones the viewer leads.
    const comparison = buildPointsComparison(
      side('Them', [{ key: 'boss', points: 900 }], 1000),
      side('You', [{ key: 'boss', points: 100 }], 5000),
    );
    const { subjectLeads, leading, trailing } =
      splitRowsByDirection(comparison);

    expect(subjectLeads).toBe(false);
    expect(leading).toHaveLength(0);
    expect(trailing.map(({ key }) => key)).toEqual(['boss']);
  });

  it('reports the folded-away side as a magnitude, so it stays on screen', () => {
    // The UI collapses these rows but keeps the number, which is the only
    // reason collapsing them is honest — the ledger still reconciles.
    expect(splitRowsByDirection(mixed()).trailingTotal).toBe(300);
  });

  it('keeps every row on one side or the other', () => {
    const comparison = mixed();
    const { leading, trailing } = splitRowsByDirection(comparison);

    expect(leading.length + trailing.length).toBe(comparison.rows.length);
  });

  it('gives a dead-level comparison to the subject', () => {
    // Nobody is ahead, and the page is about the profile's owner.
    const { subjectLeads } = splitRowsByDirection(
      buildPointsComparison(
        side('Them', [{ key: 'a', points: 100 }], 2000),
        side('You', [{ key: 'a', points: 40 }], 2000),
      ),
    );

    expect(subjectLeads).toBe(true);
  });
});
