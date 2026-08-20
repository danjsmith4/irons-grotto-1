import { NextRequest, NextResponse } from 'next/server';
import { fetchRankPace } from '@/app/data-sources/fetch-rank-pace';

// Same posture as /api/player-profile: rank history is already public on the
// player profile modal.
export async function GET(request: NextRequest) {
  try {
    const playerName = request.nextUrl.searchParams.get('name');

    if (!playerName) {
      return NextResponse.json(
        { success: false, error: 'Missing player name' },
        { status: 400 },
      );
    }

    return NextResponse.json(await fetchRankPace(playerName));
  } catch (error) {
    console.error('API Error fetching rank pace:', error);

    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 },
    );
  }
}
