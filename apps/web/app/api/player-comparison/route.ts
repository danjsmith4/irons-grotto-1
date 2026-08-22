import { NextRequest, NextResponse } from 'next/server';
import { fetchPlayerComparison } from '@/app/data-sources/fetch-player-comparison';

/**
 * An itemised diff of two members' points.
 *
 * `subject` is the profile being looked at, `viewer` is the account of the
 * signed-in user it is being measured against — the data source checks that
 * second one really is theirs.
 */
export async function GET(request: NextRequest) {
  const subject = request.nextUrl.searchParams.get('subject');
  const viewer = request.nextUrl.searchParams.get('viewer');

  if (!subject || !viewer) {
    return NextResponse.json(
      { success: false, error: 'Missing player name' },
      { status: 400 },
    );
  }

  const result = await fetchPlayerComparison(subject, viewer);

  return NextResponse.json(result, { status: result.success ? 200 : 400 });
}
