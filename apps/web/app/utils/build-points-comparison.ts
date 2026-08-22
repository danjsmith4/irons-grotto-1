import {
  PointsBreakdown,
  PointsBreakdownLine,
  PointsCategoryKey,
  pointsCategoryKeys,
  pointsCategoryLabels,
} from '@/app/rank-calculator/utils/build-points-breakdown';

export interface ComparisonSideValue {
  points: number;
  detail?: string;
}

export interface ComparisonRow {
  key: string;
  label: string;
  category: PointsCategoryKey;
  image?: string;
  subject: ComparisonSideValue;
  viewer: ComparisonSideValue;
  /**
   * `subject - viewer`, in whole points. Positive means the player being
   * looked at is ahead — the profile answers "why do *they* have the points
   * they do", so they are the subject of every sentence the UI writes.
   */
  delta: number;
}

export interface ComparisonSide {
  playerName: string;
  rank: string;
  /** What the leaderboard says — `players.points`. */
  storedPoints: number;
  /** What the itemised ledger below comes to. */
  breakdownPoints: number;
}

export interface PointsComparison {
  subject: ComparisonSide;
  viewer: ComparisonSide;
  /** `subject - viewer` on the stored totals: the gap being explained. */
  totalDelta: number;
  /** All four categories, biggest swing first. */
  categories: ComparisonRow[];
  /** Every line the two players disagree on, biggest swing first. */
  rows: ComparisonRow[];
  /** The largest `|delta|` in `rows`, so bars can be scaled against it. */
  largestDelta: number;
}

export interface DirectionalRows {
  /** Whether the profile's owner is the one ahead overall. */
  subjectLeads: boolean;
  /** The rows that explain the gap — the ones its leader is ahead on. */
  leading: ComparisonRow[];
  /** The rows working against it. Folded away by default, never dropped. */
  trailing: ComparisonRow[];
  /** The magnitude `trailing` comes to, for the label that folds it away. */
  trailingTotal: number;
}

/**
 * Splits the ledger by which way each row pushes.
 *
 * Looking up at a member, the rows that answer "why do they have those points"
 * are the ones *they* lead; the ones you lead only offset the answer, and
 * interleaving the two makes the list something to decode rather than read. So
 * the gap's own sign picks the direction that leads.
 *
 * The other direction is separated, not discarded — its total is reported here
 * precisely so the UI can keep it on screen while the rows are collapsed. On a
 * lopsided comparison it rounds to nothing; on a close one it is most of the
 * story, and a ledger that quietly dropped it would not add up to its own
 * headline.
 *
 * A dead-level comparison has no leader and falls to the subject, who is the
 * one the profile is about.
 */
export function splitRowsByDirection(
  comparison: PointsComparison,
): DirectionalRows {
  const subjectLeads = comparison.totalDelta >= 0;
  const leading: ComparisonRow[] = [];
  const trailing: ComparisonRow[] = [];

  comparison.rows.forEach((row) => {
    if (row.delta > 0 === subjectLeads) {
      leading.push(row);
    } else {
      trailing.push(row);
    }
  });

  return {
    subjectLeads,
    leading,
    trailing,
    trailingTotal: trailing.reduce(
      (total, { delta }) => total + Math.abs(delta),
      0,
    ),
  };
}

function toValue(line: PointsBreakdownLine | undefined): ComparisonSideValue {
  return { points: Math.round(line?.points ?? 0), detail: line?.detail };
}

/**
 * Orders rows by how much work they are doing in the gap, regardless of which
 * way they push. A tie falls back to the label so the list does not reshuffle
 * between two requests that produced the same numbers.
 */
function byWeight(a: ComparisonRow, b: ComparisonRow) {
  const weight = Math.abs(b.delta) - Math.abs(a.delta);

  return weight !== 0 ? weight : a.label.localeCompare(b.label);
}

/**
 * Two itemised ledgers, merged into one signed diff.
 *
 * Lines are matched on {@link PointsBreakdownLine.key}, which is derived from
 * the thing being scored rather than from its value — so an item only one of
 * them owns still produces a row, with the other side sitting at zero. That is
 * the whole point: the interesting rows are the asymmetric ones.
 */
export function buildPointsComparison(
  subject: ComparisonSide & { breakdown: PointsBreakdown },
  viewer: ComparisonSide & { breakdown: PointsBreakdown },
): PointsComparison {
  const subjectLines = new Map(
    subject.breakdown.lines.map((line) => [line.key, line]),
  );
  const viewerLines = new Map(
    viewer.breakdown.lines.map((line) => [line.key, line]),
  );

  const rows = [...new Set([...subjectLines.keys(), ...viewerLines.keys()])]
    .map((key) => {
      const subjectLine = subjectLines.get(key);
      const viewerLine = viewerLines.get(key);
      // Either side can be the one that knows about this line, and only one of
      // them has to: the label and image come from whichever does.
      const reference = (subjectLine ?? viewerLine)!;
      const subjectValue = toValue(subjectLine);
      const viewerValue = toValue(viewerLine);

      return {
        key,
        label: reference.label,
        category: reference.category,
        image: reference.image,
        subject: subjectValue,
        viewer: viewerValue,
        delta: subjectValue.points - viewerValue.points,
      } satisfies ComparisonRow;
    })
    .filter(({ delta }) => delta !== 0)
    .sort(byWeight);

  const subjectCategories = new Map(
    subject.breakdown.categories.map(({ key, points }) => [key, points]),
  );
  const viewerCategories = new Map(
    viewer.breakdown.categories.map(({ key, points }) => [key, points]),
  );

  const categories = pointsCategoryKeys
    .map((key) => {
      const subjectPoints = Math.round(subjectCategories.get(key) ?? 0);
      const viewerPoints = Math.round(viewerCategories.get(key) ?? 0);

      return {
        key,
        label: pointsCategoryLabels[key],
        category: key,
        subject: { points: subjectPoints },
        viewer: { points: viewerPoints },
        delta: subjectPoints - viewerPoints,
      } satisfies ComparisonRow;
    })
    .sort(byWeight);

  return {
    subject: {
      playerName: subject.playerName,
      rank: subject.rank,
      storedPoints: subject.storedPoints,
      breakdownPoints: subject.breakdownPoints,
    },
    viewer: {
      playerName: viewer.playerName,
      rank: viewer.rank,
      storedPoints: viewer.storedPoints,
      breakdownPoints: viewer.breakdownPoints,
    },
    totalDelta: subject.storedPoints - viewer.storedPoints,
    categories,
    rows,
    largestDelta: rows.reduce(
      (largest, { delta }) => Math.max(largest, Math.abs(delta)),
      0,
    ),
  };
}
