'use client';

import { useEffect, useState } from 'react';
import type { ViewerAccount } from '@/app/data-sources/fetch-viewer-accounts';

/**
 * The signed-in user's own accounts.
 *
 * Fetched rather than prop-drilled for the same reason as
 * `useViewerStaffRole`: the profile modal is hosted once by
 * `PlayerProfileProvider` and opens from the public homepage, the leaderboard
 * and the dashboard alike, none of which have the roster to hand.
 *
 * An empty list is the signed-out answer as well as the no-accounts one, and
 * both mean the same thing here — there is nothing to compare against.
 */
export function useViewerAccounts() {
  const [accounts, setAccounts] = useState<ViewerAccount[]>([]);

  useEffect(() => {
    const controller = new AbortController();

    fetch('/api/viewer-accounts', { signal: controller.signal })
      .then((response) => (response.ok ? response.json() : null))
      .then(
        (
          result: {
            success: boolean;
            data?: { accounts: ViewerAccount[] };
          } | null,
        ) => {
          if (result?.success) {
            setAccounts(result.data?.accounts ?? []);
          }
        },
      )
      .catch(() => {
        // A missing Compare tab is the right failure here.
      });

    return () => controller.abort();
  }, []);

  return accounts;
}
