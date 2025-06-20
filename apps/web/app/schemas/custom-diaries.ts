import { z } from 'zod';

export const CustomDiarySection = z.enum([
  'Combat',
  'Skilling',
  'Collection Log',
]);

export type CustomDiarySection = z.infer<typeof CustomDiarySection>;

export const CustomDiaryTier = z.enum([
  'Drunkard',
  'Bartender',
  'Landlord',
  'Baron',
  'Duke',
]);

export type CustomDiaryTier = z.infer<typeof CustomDiaryTier>;
