const daysPerMonth = 365.25 / 12;

/**
 * A short, glanceable duration for the scoreboard — "18d", "5mo", "2y 3mo".
 *
 * Deliberately coarse: rank pace is a rough comparison, so precision past the
 * month reads as noise.
 */
export function formatDurationCompact(days: number): string {
  if (!Number.isFinite(days) || days < 1) {
    return 'today';
  }

  if (days < 60) {
    return `${Math.round(days)}d`;
  }

  const months = Math.round(days / daysPerMonth);

  if (months < 12) {
    return `${months}mo`;
  }

  const years = Math.floor(months / 12);
  const remainingMonths = months % 12;

  return remainingMonths ? `${years}y ${remainingMonths}mo` : `${years}y`;
}
