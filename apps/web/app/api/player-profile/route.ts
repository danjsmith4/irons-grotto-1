import { NextRequest, NextResponse } from 'next/server';
import { fetchPlayerProfile } from '@/app/data-sources/fetch-player-profile';

export async function GET(request: NextRequest) {
  const name = request.nextUrl.searchParams.get('name');

  if (!name) {
    return NextResponse.json(
      { success: false, error: 'Missing player name' },
      { status: 400 },
    );
  }

  const result = await fetchPlayerProfile(name);

  return NextResponse.json(result, { status: result.success ? 200 : 404 });
}
