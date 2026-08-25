import { formatNumber } from './format-number';

export function getPointsRemainingLabel(
  pointsRemaining: number,
  throttleReason?: 'items' | 'Master CAs' | null,
) {
  if (throttleReason === 'items') {
    return 'Items required!';
  }

  if (throttleReason === 'Master CAs') {
    return 'Master CAs required!';
  }

  return pointsRemaining ? `(${formatNumber(pointsRemaining)})` : 'Completed';
}
