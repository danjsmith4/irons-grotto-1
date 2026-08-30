'use client';

import { useEffect, useState } from 'react';
import type { StaffRole } from '@/app/schemas/staff';

/**
 * The signed-in user's staff role, for chrome that appears on every page.
 *
 * ⚠️ **Pass `initial` wherever there is a server component to pass it from.**
 * Without it the Admin link cannot exist until a round trip has completed, so
 * it appears a beat after the rest of the nav and visibly pops in. The role is
 * known at render time on every page that renders a nav bar, so there is no
 * reason for the viewer to watch it arrive.
 *
 * The fetch is kept as the fallback for a caller that genuinely has nowhere to
 * get it from, and because leaving it means no call site can break by
 * forgetting. `undefined` means "not supplied, go and ask"; `null` is a real
 * answer meaning this viewer is not staff, and does not trigger a fetch.
 *
 * Purely cosmetic either way: `/admin` re-checks the ladder server-side, so a
 * stale or forged answer here shows a link that leads straight back to the
 * dashboard.
 */
export function useViewerStaffRole(initial?: StaffRole | null) {
  const [staffRole, setStaffRole] = useState<StaffRole | null>(initial ?? null);

  useEffect(() => {
    if (initial !== undefined) {
      return undefined;
    }

    const controller = new AbortController();

    fetch('/api/staff-role', { signal: controller.signal })
      .then((response) => (response.ok ? response.json() : null))
      .then(
        (
          result: {
            success: boolean;
            data?: { staffRole: StaffRole | null };
          } | null,
        ) => {
          if (result?.success) {
            setStaffRole(result.data?.staffRole ?? null);
          }
        },
      )
      .catch(() => {
        // A missing Admin link is the right failure here — leave it hidden.
      });

    return () => controller.abort();
  }, [initial]);

  return staffRole;
}
