import { NextResponse } from 'next/server';
import { fetchPublicClanEventStatus } from '@/app/data-sources/fetch-public-clan-event';
import { checkRateLimit, requestIdentifier } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

/**
 * How many requests one address may make per minute.
 *
 * The homepage makes exactly one call per load, so this is roughly "reload the
 * landing page every other second and you are still fine" — strict, without
 * being something a real visitor can reach by using the site.
 */
const requestsPerWindow = 30;
const windowSeconds = 60;

/**
 * The running and upcoming clan event, for visitors who are not signed in.
 *
 * This exists as its own endpoint rather than reusing
 * `/api/clan-events/status` because the two have different callers and should
 * keep different shapes. That one serves the signed-in nav bar: it runs a
 * sync, and it returns member names in the standings. This one is reachable by
 * anyone on the internet, so it is read-only, returns an aggregate rather than
 * a roster, and is rate limited. Collapsing them would quietly hand the wider
 * surface to the more privileged implementation.
 *
 * Nothing here is secret — a Temple competition is public and the clan's own
 * schedule is on the homepage by design. The limit is about load, not secrecy.
 */
export async function GET(request: Request) {
  const identifier = requestIdentifier(request);

  if (identifier) {
    const { allowed, limit } = await checkRateLimit({
      name: 'clan-events-public',
      key: identifier,
      limit: requestsPerWindow,
      windowSeconds,
    });

    if (!allowed) {
      return NextResponse.json(
        { success: false, error: 'Too many requests' },
        {
          status: 429,
          headers: {
            'Retry-After': String(windowSeconds),
            'X-RateLimit-Limit': String(limit),
          },
        },
      );
    }
  }

  const result = await fetchPublicClanEventStatus();

  return NextResponse.json(result, {
    status: result.success ? 200 : 500,
    headers: result.success
      ? {
          // Let the edge absorb the traffic. A minute is well inside the three
          // the Temple read is already cached for, and it means the limiter
          // above is a backstop for cache-bypassing callers rather than the
          // thing standing between the homepage and its data.
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
        }
      : { 'Cache-Control': 'no-store' },
  });
}
