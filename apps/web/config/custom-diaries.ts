import { CustomDiaryTier } from '@/app/schemas/custom-diaries';
import { invert } from 'lodash';

export const customDiaryTierBonusPoints = {
  Easy: 500,
  Hard: 1000,
  Master: 2000,
  Grandmaster: 4000,
} as const satisfies Record<CustomDiaryTier, number>;

export const customDiaryTierNameByBonusPoints = invert(
  customDiaryTierBonusPoints,
);
