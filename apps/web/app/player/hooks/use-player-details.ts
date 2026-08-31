'use client';

import { queryOptions, type QueryClient } from '@tanstack/react-query';
import type { PlayerDetailsResponse } from '../data-sources/fetch-player-details/fetch-player-details';
import type { PlayerEditableFields } from '../[player]/player-editable-schema';

/**
 * `PlayerDetailsResponse` as it survives JSON.
 *
 * Only `joinDate` changes shape — it goes over the wire as an ISO string and is
 * revived by whoever mounts the form. Everything else is already primitives.
 */
export type PlayerDetailsPayload = Omit<PlayerDetailsResponse, 'joinDate'> & {
  joinDate: string;
};

export type PlayerDetailsResult =
  | { success: true; data: PlayerDetailsPayload }
  | {
      success: false;
      error: string | null;
      /**
       * Set when the name no longer resolves on the hiscores. `fetchPlayerDetails`
       * answers that case with a server-side `redirect()` to the edit page; over
       * HTTP it has to be reported as data so the client can do the same.
       */
      redirectTo?: string;
    };

export function playerDetailsQueryKey(playerName: string) {
  return ['player-details', playerName] as const;
}

/**
 * The player's whole rank sheet, fetched over HTTP so it can be **warmed before
 * it is needed**.
 *
 * This is the single most expensive read in the app — a hiscores check, a
 * TempleOSRS datapoint push, then WikiSync, Temple stats, Temple collection log
 * and Discord roles in parallel, then the write-back. It used to run inside the
 * calculator's server component, which meant the cost was paid *after* the
 * click, with nothing on screen but `loading.tsx`.
 *
 * Moving it behind a query key puts it in the browser's React Query cache,
 * which is a module singleton and so survives soft navigation: the dashboard
 * can start it on mount and the calculator finds it already there.
 *
 * ⚠️ **`staleTime` is what makes the preload pay off.** A prefetch is only
 * useful if the consumer will accept it rather than refetch on mount; five
 * minutes covers a dashboard visit and the click that follows. The player's own
 * edits do not go stale in the meantime because autosave patches this cache
 * directly — see `patchPlayerDetailsCache`.
 */
export function playerDetailsQueryOptions(playerName: string) {
  return queryOptions({
    queryKey: playerDetailsQueryKey(playerName),
    async queryFn(): Promise<PlayerDetailsResult> {
      const response = await fetch(
        `/api/player-details?name=${encodeURIComponent(playerName)}`,
      );

      return response.json() as Promise<PlayerDetailsResult>;
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    // A failed sheet load is reported, not retried three times: every attempt
    // pushes another datapoint at Temple.
    retry: false,
    // ⚠️ **Nothing re-reads this query once the form is up.** `useForm` takes
    // its `defaultValues` once, so a refetch behind a mounted calculator cannot
    // change anything on screen — it would only spend the most expensive call
    // in the app, and another Temple datapoint, to update a cache entry nobody
    // reads. Tabbing away for lunch and back is exactly that case.
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
}

/**
 * Keeps the cached sheet in step with a write that has already landed.
 *
 * Without this the cache is a **trap**: edit an item, go back to the dashboard,
 * return within `staleTime`, and the form would mount from the pre-edit
 * snapshot and show the tick undone. Invalidating instead would be worse — the
 * calculator is an active observer of this query, so marking it stale during
 * editing would refetch (and re-push a Temple datapoint) on every autosave.
 *
 * The patch is a subset of the form's own fields with identical shapes, so
 * merging it over the cached payload is exactly the change the server just
 * made, at no request cost.
 */
export function patchPlayerDetailsCache(
  queryClient: QueryClient,
  playerName: string,
  patch: PlayerEditableFields,
) {
  queryClient.setQueryData<PlayerDetailsResult>(
    playerDetailsQueryKey(playerName),
    (previous) =>
      previous?.success
        ? { ...previous, data: { ...previous.data, ...patch } }
        : previous,
  );
}
