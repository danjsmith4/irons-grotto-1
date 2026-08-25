import { Rank } from '@/config/enums';

export interface RankPaceHistoryEntry {
  oldRank: string | null;
  newRank: string;
  createdAt: string;
}

export interface ClanRankPace {
  medianDays: number;
  sampleSize: number;
}

/**
 * Completed stints a rank needs before its median is worth showing.
 *
 * Most ranks have only a handful of promotions behind them, and the jumps are
 * wildly uneven — Captain → General is thousands of points, so a single member
 * who happened to be one drop away from it can otherwise make the rank look
 * like a one-day formality. Below this, we say nothing rather than something
 * misleading.
 *
 * Nothing renders the median today (see `clan-median-pace.tsx`), but the
 * numbers are still computed so the feature can be switched back on.
 */
export const minimumPaceSampleSize = 5;

export interface RankPaceResult {
  /** Days the player has held their current rank. */
  daysAtRank: number;
  /**
   * Median days the clan spends at this rank. Null when too few members have
   * left it for the figure to mean anything.
   */
  clanMedianDays: number | null;
  /** Completed stints behind the median, whether or not it was shown. */
  clanSampleSize: number;
  /**
   * True when the player has held the rank longer than the clan median — i.e.
   * they're overdue a promotion. Null when there's nothing to compare against.
   */
  isBehindPace: boolean | null;
  /** When the current stint started — a rank-up, or falling back to join date. */
  since: Date;
  /** False when the stint is dated from the join date rather than a rank-up. */
  isFromRankUp: boolean;
}

/**
 * How long the player has sat at `rank`, against how long the clan usually
 * does.
 *
 * The stint starts at their most recent promotion *to* this rank. Players who
 * have never ranked up (or whose history predates rank tracking) fall back to
 * their join date, which is flagged so the UI can hedge the wording.
 */
export function calculateRankPace(
  history: RankPaceHistoryEntry[],
  joinDate: string,
  clanPaceByRank: Record<string, ClanRankPace>,
  rank: Rank,
  now: Date = new Date(),
): RankPaceResult | null {
  const promotion = [...history]
    .reverse()
    .find((entry) => entry.newRank === rank);

  const since = new Date(promotion?.createdAt ?? joinDate);

  if (Number.isNaN(since.getTime())) {
    return null;
  }

  const daysAtRank = Math.max(
    0,
    (now.getTime() - since.getTime()) / (1000 * 60 * 60 * 24),
  );
  const clanPace = clanPaceByRank[rank];
  const hasEnoughData =
    !!clanPace && clanPace.sampleSize >= minimumPaceSampleSize;
  const clanMedianDays = hasEnoughData ? clanPace.medianDays : null;

  return {
    daysAtRank,
    clanMedianDays,
    clanSampleSize: clanPace?.sampleSize ?? 0,
    isBehindPace: clanMedianDays === null ? null : daysAtRank > clanMedianDays,
    since,
    isFromRankUp: !!promotion,
  };
}
