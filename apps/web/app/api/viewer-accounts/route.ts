import { NextResponse } from 'next/server';
import { fetchViewerAccounts } from '@/app/data-sources/fetch-viewer-accounts';

/**
 * The signed-in user's own accounts. Read by the profile modal to decide
 * whether a comparison is possible, and against which of them.
 */
export async function GET() {
  const result = await fetchViewerAccounts();

  return NextResponse.json(result, { status: result.success ? 200 : 500 });
}
