'use client';

import { useQuery } from '@tanstack/react-query';
import { useWatch } from 'react-hook-form';
import { Rank } from '@/config/enums';
import type { RankPace } from '@/app/data-sources/fetch-rank-pace';
import { RankCalculatorSchema } from '../[player]/submit-rank-calculator-validation';
import {
  calculateRankPace,
  RankPaceResult,
} from '../utils/calculators/calculate-rank-pace';

type RankPaceResponse =
  | { success: true; data: RankPace }
  | { success: false; error: string };

/**
 * How long the player has held `rank`, against the clan's median for it.
 * Recomputed locally when the rank changes — the history is fetched once.
 */
export function useRankPace(rank: Rank): RankPaceResult | null {
  const playerName = useWatch<RankCalculatorSchema, 'playerName'>({
    name: 'playerName',
  });

  const { data } = useQuery({
    queryKey: ['rank-pace', playerName],
    async queryFn(): Promise<RankPaceResponse> {
      const response = await fetch(
        `/api/rank-pace?name=${encodeURIComponent(playerName)}`,
      );

      return response.json() as Promise<RankPaceResponse>;
    },
    staleTime: 5 * 60 * 1000,
  });

  if (!data?.success) {
    return null;
  }

  const { history, joinDate, clanPaceByRank } = data.data;

  return calculateRankPace(history, joinDate, clanPaceByRank, rank);
}
