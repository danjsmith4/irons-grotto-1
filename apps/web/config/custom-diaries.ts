import { CustomDiaryTier } from '@/app/schemas/custom-diaries';
import { invert } from 'lodash';

export const customDiaryTierMultipliers = {
  Drunkard: 0.05,
  Bartender: 0.1,
  Landlord: 0.2,
  Baron: 0.3,
  Duke: 0.4,
} as const satisfies Record<CustomDiaryTier, number>;

export const customDiaryTierNameByMultiplier = invert(
  customDiaryTierMultipliers,
);
