import 'server-only';
import { redis } from '@/redis';

export interface RateLimitOptions {
  /** Namespace for the counter, so two endpoints never share a bucket. */
  name: string;
  /** Requests allowed per window, per caller. */
  limit: number;
  /** Window length in seconds. */
  windowSeconds: number;
}

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  /** Requests left in the current window; never negative. */
  remaining: number;
}

/**
 * A fixed-window per-caller rate limit, on the Redis we already run.
 *
 * The window is anchored to the first request rather than sliding: `incr`
 * creates the key, and only that first call sets the expiry. A caller who
 * trips the limit therefore waits out the remainder of their window and is
 * then clear, instead of being held under by their own retries.
 *
 * ⚠️ **It fails open, deliberately.** Everything behind this limiter is public
 * read-only data that is already cached at the edge, so the worst a Redis
 * outage can cost is some extra reads of something cheap. Failing closed would
 * mean an unrelated Redis problem takes out the public homepage, which is a
 * far worse outcome than the one being defended against.
 */
export async function checkRateLimit({
  name,
  key,
  limit,
  windowSeconds,
}: RateLimitOptions & {
  /** Who is being limited — an address, or whatever identifies the caller. */
  key: string;
}): Promise<RateLimitResult> {
  const allow: RateLimitResult = { allowed: true, limit, remaining: limit };

  try {
    const redisKey = `rate-limit:${name}:${key}`;
    const count = await redis.incr(redisKey);

    // Only the request that created the key sets the expiry. Re-setting it on
    // every hit would turn this into a sliding window that a steady trickle
    // could keep alive indefinitely.
    if (count === 1) {
      await redis.expire(redisKey, windowSeconds);
    }

    return {
      allowed: count <= limit,
      limit,
      remaining: Math.max(0, limit - count),
    };
  } catch (error) {
    console.error(`Rate limit check failed for ${name}:`, error);

    return allow;
  }
}

/**
 * The caller's address, as the proxy in front of us reports it.
 *
 * ⚠️ Returns null rather than a placeholder when there is no usable address.
 * Bucketing every anonymous caller under one key would let a single noisy
 * client lock out every other visitor at once — a self-inflicted outage in
 * place of the abuse it was meant to stop. Callers treat null as "don't
 * limit"; the header is set by the platform on every real request, and the
 * data behind this is public anyway, so spoofing it wins nothing worth having.
 */
export function requestIdentifier(request: Request): string | null {
  // Each candidate is checked for emptiness rather than merely for presence: a
  // header that is set but blank would otherwise become a blank key, which is
  // the one-bucket-for-everyone case this function exists to avoid.
  const candidates = [
    request.headers.get('x-forwarded-for')?.split(',')[0],
    request.headers.get('x-real-ip'),
  ];

  for (const candidate of candidates) {
    const trimmed = candidate?.trim();

    if (trimmed) {
      return trimmed;
    }
  }

  return null;
}
