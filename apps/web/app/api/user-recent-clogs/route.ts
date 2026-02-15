import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { fetchUserRecentClogs } from '@/app/data-sources/fetch-user-recent-clogs';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 },
      );
    }

    const body = (await request.json()) as {
      playerNames?: unknown;
      limit?: number;
      offset?: number;
    };
    const { playerNames, limit = 20, offset = 0 } = body;

    if (!Array.isArray(playerNames)) {
      return NextResponse.json(
        { success: false, error: 'Invalid playerNames' },
        { status: 400 },
      );
    }

    const result = await fetchUserRecentClogs(
      playerNames as string[],
      limit,
      offset,
    );
    return NextResponse.json(result);
  } catch (error) {
    console.error('API Error fetching user recent clogs:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 },
    );
  }
}
