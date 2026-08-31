'use client';

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { playerDetailsQueryOptions } from '@/app/player/hooks/use-player-details';
import { rankPaceQueryOptions } from '@/app/player/hooks/use-rank-pace';
import { clanPointDistributionQueryOptions } from '@/app/player/hooks/use-clan-standing';

interface PreloadCalculatorDataProps {
  /** The viewer's own accounts, in the order the nav lists them. */
  playerNames: string[];
}

/**
 * Warms the viewer's rank sheet while they are reading the dashboard.
 *
 * The calculator's load is dominated by one call — the hiscores check, the
 * TempleOSRS datapoint push, then WikiSync/Temple/Discord in parallel, then the
 * write-back. That work is the same whenever it runs, so the only question is
 * whether the member spends it watching a spinner. Started here it overlaps
 * with them reading the leaderboard and the feeds, and the click that follows
 * finds the answer already in the React Query cache.
 *
 * Renders nothing, and is deliberately not suspended on: a preload that is
 * still running must never hold up the page that hosts it.
 *
 * ⚠️ **Sequential, not parallel.** Every sheet pushes a datapoint at Temple,
 * which rate-limits at roughly ten a minute — a member with four accounts
 * firing four at once is the one shape that could get them throttled, and
 * nothing here is urgent enough to be worth that.
 *
 * ⚠️ **Prefetch, not fetch.** `prefetchQuery` is a no-op while the data is
 * still fresh, so returning to the dashboard between edits does not re-run the
 * whole sync, and it never throws into the render tree.
 */
export function PreloadCalculatorData({
  playerNames,
}: PreloadCalculatorDataProps) {
  const queryClient = useQueryClient();
  // Depend on the contents rather than the array identity: the parent builds a
  // new array on every render, which would restart the walk each time.
  const names = playerNames.join('\n');

  useEffect(() => {
    if (!names) {
      return undefined;
    }

    let cancelled = false;

    void (async () => {
      for (const playerName of names.split('\n')) {
        if (cancelled) {
          return;
        }

        await queryClient.prefetchQuery(playerDetailsQueryOptions(playerName));

        // The two the hero fetches for itself once it is on screen. Cheap
        // database reads with no third party behind them, so they can go
        // together rather than extending the walk.
        await Promise.all([
          queryClient.prefetchQuery(rankPaceQueryOptions(playerName)),
          queryClient.prefetchQuery(
            clanPointDistributionQueryOptions(playerName),
          ),
        ]);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [names, queryClient]);

  return null;
}
