import '@testing-library/jest-dom';
import { server } from './mocks/server';
import { mockUUID } from './test-utils/mock-uuid';

jest.mock('crypto', () => ({
  randomUUID: jest.fn().mockReturnValue(mockUUID),
}));

if (/\*|msw/.test(process.env.DEBUG ?? '')) {
  server.events.on('request:start', ({ request }) => {
    console.log('Outgoing:', request.method, request.url);
  });

  server.events.on('response:mocked', ({ request, response }) => {
    console.log(
      '%s %s received %s %s',
      request.method,
      request.url,
      response.status,
      response.statusText,
    );
  });
}

server.events.on('unhandledException', ({ request, error }) => {
  console.log('%s %s errored! See details below.', request.method, request.url);
  console.error(error);
});

// `unstable_cache` needs Next's incremental cache runtime, which isn't present
// under Jest. Call through so cached data-sources (e.g. fetchItemDropRates) run.
jest.mock('next/cache', () => {
  const actual = jest.requireActual<typeof import('next/cache')>('next/cache');

  return {
    ...actual,
    unstable_cache:
      (fn: (...args: unknown[]) => unknown) =>
      (...args: unknown[]) =>
        fn(...args),
  };
});

jest.mock('next-auth', () => {
  const originalModule =
    jest.requireActual<typeof import('next-auth')>('next-auth');

  return {
    __esModule: true,
    ...originalModule,
    default: jest.fn().mockReturnValue({
      auth: jest.fn(),
      signIn: jest.fn(),
      signOut: jest.fn(),
      handlers: {
        GET: jest.fn(),
        POST: jest.fn(),
      },
    }),
  };
});

beforeAll(() => {
  server.listen({
    onUnhandledRequest: 'error',
  });
});

afterEach(() => {
  server.resetHandlers();
});

afterAll(() => {
  server.close();
});
