import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { fetchPlayerDetails } from '@/app/player/data-sources/fetch-player-details/fetch-player-details';

/**
 * Next signals `redirect()` by throwing, and the digest is the only thing that
 * tells that error apart from a real one.
 *
 * `fetchPlayerDetails` redirects to the edit page when a player's name stops
 * resolving on the hiscores. In a server component that is the whole answer; in
 * a route handler Next would turn it into a 307 and the caller would parse an
 * HTML page as JSON, so it is caught here and reported as data instead.
 */
function isRedirectError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'digest' in error &&
    typeof (error as { digest: unknown }).digest === 'string' &&
    (error as { digest: string }).digest.startsWith('NEXT_REDIRECT')
  );
}

/**
 * One player's full rank sheet.
 *
 * The same call the calculator's page used to make inline, exposed so it can be
 * **started before the click** — the dashboard warms it for the viewer's own
 * accounts on mount (`PreloadCalculatorData`), and the calculator reads it out
 * of the React Query cache.
 *
 * Ownership is not checked here because it does not need to be:
 * `getPlayerByName` inside `fetchPlayerDetails` is scoped to the caller's
 * Discord id, so somebody else's account comes back as "not found".
 */
export async function GET(request: NextRequest) {
  const playerName = request.nextUrl.searchParams.get('name');

  if (!playerName) {
    return NextResponse.json(
      { success: false, error: 'A player name is required' },
      { status: 400 },
    );
  }

  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json(
      { success: false, error: 'Not signed in' },
      { status: 401 },
    );
  }

  try {
    const result = await fetchPlayerDetails(playerName, session.user.id);

    return NextResponse.json(result, { status: result.success ? 200 : 404 });
  } catch (error) {
    if (isRedirectError(error)) {
      return NextResponse.json(
        {
          success: false,
          error: 'This account no longer resolves on the hiscores',
          redirectTo: `/player/${encodeURIComponent(playerName)}/edit`,
        },
        { status: 200 },
      );
    }

    throw error;
  }
}
