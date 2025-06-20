import { z } from 'zod';

export const CustomDiarySection = z.enum(['Combat']);

export type CustomDiarySection = z.infer<typeof CustomDiarySection>;

export const CustomDiaryTier = z.enum([
  'Easy',
  'Hard',
  'Master',
  'Grandmaster',
]);

export type CustomDiaryTier = z.infer<typeof CustomDiaryTier>;
