import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { fetchLeaderboard } from '@/app/data-sources/fetch-leaderboard';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 },
      );
    }

    const body = (await request.json()) as { limit?: number; offset?: number };
    const { limit = 50, offset = 0 } = body;

    const result = await fetchLeaderboard(limit, offset);
    return NextResponse.json(result);
  } catch (error) {
    console.error('API Error fetching leaderboard:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 },
    );
  }
}
