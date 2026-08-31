'use client';

import { queryOptions, useQuery } from '@tanstack/react-query';
import { useWatch } from 'react-hook-form';
import type { ClanPointDistribution } from '@/app/data-sources/fetch-clan-point-distribution';
import { RankCalculatorSchema } from '../[player]/submit-rank-calculator-validation';
import { useTotalPoints } from './point-calculator/use-total-points';
import {
  calculateClanStanding,
  ClanStanding,
} from '../utils/calculators/calculate-clan-standing';

type DistributionResponse =
  | { success: true; data: ClanPointDistribution }
  | { success: false; error: string };

/**
 * Shared with the dashboard preloader, which warms this alongside the sheet
 * itself — the hero's standing chip is drawn from it.
 */
export function clanPointDistributionQueryOptions(playerName: string) {
  return queryOptions({
    queryKey: ['clan-point-distribution', playerName],
    async queryFn(): Promise<DistributionResponse> {
      const response = await fetch(
        `/api/clan-point-distribution?exclude=${encodeURIComponent(playerName)}`,
      );

      return response.json() as Promise<DistributionResponse>;
    },
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Where this submission's points would place the player in the clan. Recomputed
 * locally as points change — the distribution is fetched once.
 */
export function useClanStanding(): ClanStanding | null {
  const pointsAwarded = useTotalPoints();
  const playerName = useWatch<RankCalculatorSchema, 'playerName'>({
    name: 'playerName',
  });

  const { data } = useQuery(clanPointDistributionQueryOptions(playerName));

  if (!data?.success) {
    return null;
  }

  const { points, memberCount } = data.data;

  return calculateClanStanding(points, memberCount, pointsAwarded);
}

/**
 * The top of the clan is small enough that an exact position means something;
 * past it a percentile reads better than "#137".
 */
export const exactPositionThreshold = 20;
