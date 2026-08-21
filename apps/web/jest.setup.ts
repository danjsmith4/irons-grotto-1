import '@testing-library/jest-dom';
import { server } from './mocks/server';
import { mockUUID } from './test-utils/mock-uuid';

// Only randomUUID is stubbed — the rest of the module must call through, or
// anything hashing (e.g. jsum in build-notable-item-list) fails to load.
jest.mock('crypto', () => {
  const actual = jest.requireActual<typeof import('crypto')>('crypto');

  return {
    ...actual,
    randomUUID: jest.fn().mockReturnValue(mockUUID),
  };
});

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

// The mock that used to sit here stubbed `updatePlayerPointsAction`, because
// the calculator wrote the player's points from an effect and that reached for
// a real postgres connection under Jest. Points are now recalculated
// server-side in `processPlayerData`, so nothing in a component tree writes
// them and there is nothing left to stub.

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
