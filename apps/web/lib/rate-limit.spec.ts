import { checkRateLimit, requestIdentifier } from './rate-limit';

const incr = jest.fn<Promise<number>, [string]>();
const expire = jest.fn<Promise<number>, [string, number]>();

/*
 * Relative, not `@/redis`. The `@/*` alias is rewritten by the SWC transform
 * at compile time, so it resolves for a static import but not for the runtime
 * string `jest.mock` is handed — which fails as "Cannot find module".
 */
jest.mock('../redis', () => ({
  redis: {
    incr: (key: string) => incr(key),
    expire: (key: string, seconds: number) => expire(key, seconds),
  },
}));

const options = {
  name: 'test-endpoint',
  key: '203.0.113.7',
  limit: 3,
  windowSeconds: 60,
};

beforeEach(() => {
  incr.mockReset().mockResolvedValue(1);
  expire.mockReset().mockResolvedValue(1);
});

describe('checkRateLimit', () => {
  it('allows a caller up to the limit and refuses the request past it', async () => {
    incr.mockResolvedValueOnce(3);
    expect(await checkRateLimit(options)).toMatchObject({
      allowed: true,
      remaining: 0,
    });

    incr.mockResolvedValueOnce(4);
    expect(await checkRateLimit(options)).toMatchObject({
      allowed: false,
      remaining: 0,
    });
  });

  it('namespaces the counter so two endpoints never share a bucket', async () => {
    await checkRateLimit(options);
    await checkRateLimit({ ...options, name: 'other-endpoint' });

    expect(incr).toHaveBeenNthCalledWith(
      1,
      'rate-limit:test-endpoint:203.0.113.7',
    );
    expect(incr).toHaveBeenNthCalledWith(
      2,
      'rate-limit:other-endpoint:203.0.113.7',
    );
  });

  /**
   * The window is anchored, not sliding — so a caller who trips the limit
   * waits out the remainder of it rather than being held under by their own
   * retries refreshing the expiry.
   */
  it('sets the expiry only on the request that opens the window', async () => {
    incr.mockResolvedValueOnce(1);
    await checkRateLimit(options);
    expect(expire).toHaveBeenCalledWith(
      'rate-limit:test-endpoint:203.0.113.7',
      60,
    );

    expire.mockClear();

    incr.mockResolvedValueOnce(2);
    await checkRateLimit(options);
    expect(expire).not.toHaveBeenCalled();
  });

  /**
   * The limiter guards public, already-cached data. An unrelated Redis outage
   * taking down the homepage's data would be a far worse failure than the one
   * being defended against.
   */
  it('fails open when Redis cannot be reached', async () => {
    jest.spyOn(console, 'error').mockImplementationOnce(jest.fn);
    incr.mockRejectedValueOnce(new Error('connection refused'));

    expect(await checkRateLimit(options)).toMatchObject({
      allowed: true,
      remaining: 3,
    });
  });
});

describe('requestIdentifier', () => {
  const withHeaders = (headers: Record<string, string>) =>
    new Request('https://example.test/api', { headers });

  it('takes the client from the front of a forwarded chain', () => {
    expect(
      requestIdentifier(
        withHeaders({ 'x-forwarded-for': '203.0.113.7, 70.41.3.18' }),
      ),
    ).toBe('203.0.113.7');
  });

  it('falls back to x-real-ip', () => {
    expect(
      requestIdentifier(withHeaders({ 'x-real-ip': '198.51.100.4' })),
    ).toBe('198.51.100.4');
  });

  /**
   * ⚠️ The whole point of returning null. A blank identifier would become a
   * shared bucket, and one noisy caller would then lock out every other
   * visitor at once — a self-inflicted outage in place of the abuse it was
   * meant to stop.
   */
  it('reports no identifier rather than a blank one', () => {
    expect(requestIdentifier(withHeaders({}))).toBeNull();
    expect(
      requestIdentifier(withHeaders({ 'x-forwarded-for': '   ' })),
    ).toBeNull();
    expect(
      requestIdentifier(withHeaders({ 'x-forwarded-for': ' , 70.41.3.18' })),
    ).toBeNull();
  });
});
