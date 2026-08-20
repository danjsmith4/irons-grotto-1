'use client';

import { useEffect, useState } from 'react';
import type { StaffRole } from '@/app/schemas/staff';

/**
 * The signed-in user's staff role, for chrome that appears on every page.
 *
 * Fetched rather than passed down because the nav bar is rendered from three
 * unrelated trees, only one of which is a server component with the roster to
 * hand. Purely cosmetic: `/admin` re-checks the ladder server-side, so a stale
 * or forged answer here shows a link that leads straight back to the
 * dashboard.
 */
export function useViewerStaffRole() {
  const [staffRole, setStaffRole] = useState<StaffRole | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    fetch('/api/staff-role', { signal: controller.signal })
      .then((response) => (response.ok ? response.json() : null))
      .then((result: { success: boolean; data?: { staffRole: StaffRole | null } } | null) => {
        if (result?.success) {
          setStaffRole(result.data?.staffRole ?? null);
        }
      })
      .catch(() => {
        // A missing Admin link is the right failure here — leave it hidden.
      });

    return () => controller.abort();
  }, []);

  return staffRole;
}
