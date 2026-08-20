import { NextRequest, NextResponse } from 'next/server';
import { fetchClanPointDistribution } from '@/app/data-sources/fetch-clan-point-distribution';

// Same posture as /api/leaderboard: this exposes nothing the public leaderboard
// doesn't already show, and the rank calculator reads it on every page load.
export async function GET(request: NextRequest) {
  try {
    const exclude = request.nextUrl.searchParams.get('exclude') ?? undefined;
    const result = await fetchClanPointDistribution(exclude);

    return NextResponse.json(result);
  } catch (error) {
    console.error('API Error fetching clan point distribution:', error);

    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 },
    );
  }
}
