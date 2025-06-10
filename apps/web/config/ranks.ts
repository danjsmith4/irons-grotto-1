import { z } from 'zod';
import { Rank } from './enums';
import { RankStructure } from '@/app/schemas/rank-calculator';

export const rankNames = {
  Astral: 'Staff',
} satisfies Partial<Record<Rank, string>>;

export const StandardRank = Rank.extract([
  'Champion',
  'Recruit',
  'Pawn',
  'Corporal',
  'Novice',
  'Sergeant',
  'Cadet',
  'Lieutenant',
  'Proselyte',
  'Captain',
  'General',
  'Skulled',
  'Beast',
]);

export type StandardRank = z.infer<typeof StandardRank>;

export const rankThresholds: Record<
  RankStructure,
  Partial<Record<Rank, number>>
> = {
  Standard: {
    Champion: 0,
    Recruit: 500,
    Pawn: 1000,
    Corporal: 1750,
    Novice: 3000,
    Sergeant: 4500,
    Cadet: 7000,
    Lieutenant: 9000,
    Proselyte: 11000,
    Captain: 13000,
    General: 16000,
    Skulled: 19000,
    Beast: 24000,
  },
  'Deputy Owner': {
    'Deputy Owner': 0,
  },
  Admin: {
    Administrator: 0,
  },
  Owner: {
    Owner: 0,
  },
  Moderator: {
    Moderator: 0,
  },
} as const;
