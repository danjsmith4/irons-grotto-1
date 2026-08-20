import { NextResponse } from 'next/server';
import { fetchViewerStaffRole } from '@/app/data-sources/fetch-viewer-staff-role';

/**
 * The signed-in user's staff role. Read by the nav bar to decide whether the
 * Admin link belongs there — the page itself re-checks, so this is only ever
 * about what is shown.
 */
export async function GET() {
  const result = await fetchViewerStaffRole();

  return NextResponse.json(result, { status: result.success ? 200 : 500 });
}
