export interface ClanStanding {
  /** 1-based position against active members. */
  position: number;
  memberCount: number;
  /**
   * How far up the clan this places them, 0–1 — i.e. "in the top N%", so
   * smaller is better. #1 of 100 is 0.01, not 0.99.
   */
  topPercent: number;
}

/**
 * Places a live points total against the rest of the clan.
 *
 * @param otherPoints every *other* active member's points
 * @param memberCount active members, including the player being placed
 */
export function calculateClanStanding(
  otherPoints: number[],
  memberCount: number,
  pointsAwarded: number,
): ClanStanding | null {
  if (memberCount <= 0) {
    return null;
  }

  const position =
    otherPoints.filter((points) => points > pointsAwarded).length + 1;

  return {
    position,
    memberCount,
    topPercent: position / memberCount,
  };
}
