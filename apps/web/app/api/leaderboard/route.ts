import { NextRequest, NextResponse } from 'next/server';
import { fetchLeaderboard } from '@/app/data-sources/fetch-leaderboard';

// Public, like /api/player-profile: this only pages through the leaderboard the
// homepage already server-renders. Gating it behind a session broke infinite
// scroll for logged-out visitors, who are most of the homepage's traffic.
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { limit?: number; offset?: number };
    const { limit = 50, offset = 0 } = body;

    // Clamp: the endpoint is unauthenticated, so don't let a caller ask for the
    // whole table in one request.
    const result = await fetchLeaderboard(
      Math.min(Math.max(Number(limit) || 50, 1), 100),
      Math.max(Number(offset) || 0, 0),
    );
    return NextResponse.json(result);
  } catch (error) {
    console.error('API Error fetching leaderboard:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 },
    );
  }
}
