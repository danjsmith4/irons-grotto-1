/**
 * @jest-environment node
 */
const mockReturning = jest.fn();
const mockWhere = jest.fn();

jest.mock('../../../lib/db', () => ({
  db: {
    insert: () => ({
      values: () => ({
        onConflictDoUpdate: () => ({ returning: mockReturning }),
      }),
    }),
    update: () => ({ set: () => ({ where: mockWhere }) }),
  },
}));

// Imported after the mock for readability only — `jest.mock` is hoisted above
// it regardless.
import { claimJobLease, releaseJobLease } from './scheduled-job';

beforeEach(() => {
  jest.clearAllMocks();
  mockWhere.mockResolvedValue(undefined);
});

describe('claimJobLease', () => {
  it('claims the lease when the conditional upsert returns a row', async () => {
    mockReturning.mockResolvedValue([{ id: 'player-refresh' }]);

    await expect(claimJobLease('player-refresh', 600)).resolves.toBe(true);
  });

  it('refuses when another run already holds an unexpired lease', async () => {
    // An empty result is the whole mechanism: the update's `setWhere` only
    // fires once the previous lease has aged out, so two simultaneous callers
    // cannot both come back with a row.
    mockReturning.mockResolvedValue([]);

    await expect(claimJobLease('player-refresh', 600)).resolves.toBe(false);
  });

  it('runs anyway when the lease cannot be read', async () => {
    // Failing open is deliberate. A missed lease risks a duplicated run, which
    // wastes rate limit; refusing to run means the data stops updating, which
    // is the failure this whole subsystem exists to prevent.
    mockReturning.mockRejectedValue(new Error('connection terminated'));

    await expect(claimJobLease('player-refresh', 600)).resolves.toBe(true);
  });
});

describe('releaseJobLease', () => {
  it('backdates the row rather than deleting it', async () => {
    // The row doubles as the record of when the job last ran, which other code
    // reads, so releasing must not remove it.
    await releaseJobLease('player-refresh', 600);

    expect(mockWhere).toHaveBeenCalled();
  });

  it('never throws, so it is safe in a finally', async () => {
    mockWhere.mockRejectedValue(new Error('connection terminated'));

    await expect(
      releaseJobLease('player-refresh', 600),
    ).resolves.toBeUndefined();
  });
});
