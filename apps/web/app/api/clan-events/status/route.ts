import { NextResponse } from 'next/server';
import { fetchClanEventStatus } from '@/app/data-sources/fetch-clan-event-status';

/**
 * The running and upcoming clan event, with the top of the standings.
 *
 * Read by the nav bar's status indicator, which is rendered on every signed-in
 * page. Nothing here is privileged — a Temple competition's standings are
 * public — so there is no staff check; the admin pane is where events are
 * *changed*, and that is gated separately.
 */
export async function GET() {
  const result = await fetchClanEventStatus();

  return NextResponse.json(result, { status: result.success ? 200 : 500 });
}
