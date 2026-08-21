import { http, HttpResponse } from 'msw';
import { server } from '@/mocks/server';
import { ensureTrackedOnTemple } from './ensure-tracked-on-temple';

/** Temple answers with an error *body*, not a 404, for a player it has never seen. */
const notFound = { error: { Code: 402, Message: 'User not found in database' } };

const playerInfo = { data: { 'Game mode': 1, GIM: 0 } };

interface TempleMock {
  /** Number of `player_info.php` calls before the account starts resolving. */
  appearsAfter?: number;
}

function mockTemple({ appearsAfter = 0 }: TempleMock = {}) {
  const calls = { info: 0, addDatapoint: 0 };

  server.use(
    http.get('https://templeosrs.com/api/player_info.php', () => {
      calls.info += 1;

      return HttpResponse.json(
        calls.info > appearsAfter ? playerInfo : notFound,
      );
    }),
    http.get('https://templeosrs.com/php/add_datapoint.php', () => {
      calls.addDatapoint += 1;

      return HttpResponse.text('ok');
    }),
  );

  return calls;
}

describe('ensureTrackedOnTemple', () => {
  it('does nothing to an account Temple already knows', async () => {
    const calls = mockTemple();

    await expect(ensureTrackedOnTemple('player')).resolves.toEqual({
      isTracked: true,
      info: playerInfo.data,
      didRegister: false,
    });
    expect(calls.addDatapoint).toBe(0);
  });

  it('registers an account Temple has never seen, and re-checks', async () => {
    const calls = mockTemple({ appearsAfter: 1 });

    await expect(ensureTrackedOnTemple('player')).resolves.toEqual({
      isTracked: true,
      info: playerInfo.data,
      didRegister: true,
    });
    expect(calls.addDatapoint).toBe(1);
  });

  it('keeps re-checking while Temple catches up', async () => {
    const calls = mockTemple({ appearsAfter: 2 });

    await expect(ensureTrackedOnTemple('player')).resolves.toMatchObject({
      isTracked: true,
    });
    // The first read, then two of the three backoff attempts.
    expect(calls.info).toBe(3);
  }, 20000);

  it('reports failure rather than inventing an answer', async () => {
    mockTemple({ appearsAfter: Infinity });

    await expect(ensureTrackedOnTemple('player')).resolves.toEqual({
      isTracked: false,
      info: null,
      didRegister: true,
    });
  }, 20000);
});
