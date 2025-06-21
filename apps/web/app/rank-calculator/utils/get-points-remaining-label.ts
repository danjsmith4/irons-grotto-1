import { formatNumber } from './format-number';

export function getPointsRemainingLabel(
  pointsRemaining: number,
  throttleReason?: 'items' | 'GM CAs' | null,
) {
  if (throttleReason === 'items') {
    return 'Items required!';
  }

  if (throttleReason === 'GM CAs') {
    return 'GM CAs required!';
  }

  return pointsRemaining ? `(${formatNumber(pointsRemaining)})` : 'Completed';
}
