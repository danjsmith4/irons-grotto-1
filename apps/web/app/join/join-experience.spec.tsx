// Plain render rather than the `test-utils` wrapper: onboarding deliberately
// mounts outside the app's providers (it has no nav and no profile modal), and
// wrapping it here would fetch `/api/viewer-accounts` for nothing.
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import type { ClanStats } from '@/app/data-sources/fetch-clan-stats';
import { JoinExperience } from './join-experience';

const push = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
}));

/**
 * The scan actions are server actions, so they are stubbed wholesale. This spec
 * is about the experience mounting and the welcome step behaving — the scan's
 * own decisions are covered by the pure functions in `utils/`.
 */
const scanHiscoresAction = jest.fn<Promise<unknown>, [unknown]>();
const scanTempleAction = jest.fn<Promise<unknown>, [unknown]>();
const scanCollectionLogAction = jest.fn<Promise<unknown>, [unknown]>();
const scanAchievementsAction = jest.fn<Promise<unknown>, [unknown]>();
const scanClanRecordAction = jest.fn<Promise<unknown>, [unknown]>();

jest.mock('./actions/scan-hiscores-action', () => ({
  scanHiscoresAction: (input: unknown) => scanHiscoresAction(input),
}));
jest.mock('./actions/scan-temple-action', () => ({
  scanTempleAction: (input: unknown) => scanTempleAction(input),
}));
jest.mock('./actions/scan-collection-log-action', () => ({
  scanCollectionLogAction: (input: unknown) => scanCollectionLogAction(input),
}));
jest.mock('./actions/scan-achievements-action', () => ({
  scanAchievementsAction: (input: unknown) => scanAchievementsAction(input),
}));
jest.mock('./actions/scan-clan-record-action', () => ({
  scanClanRecordAction: (input: unknown) => scanClanRecordAction(input),
}));
jest.mock('./actions/add-player-action', () => ({
  addPlayerAction: jest.fn(),
}));
jest.mock('./actions/reveal-rank-action', () => ({
  revealRankAction: jest.fn(),
}));

const stats: ClanStats = {
  memberCount: 130,
  totalPoints: 1_000_000,
  totalClogSlots: 84_000,
  totalPets: 1_400,
  zukHelmCount: 6,
  avgTotalLevel: 2_100,
  bloodTorvaCount: 9,
  radiantCount: 3,
  infernalCount: 21,
  quiverCount: 14,
};

const members = [
  { rsn: 'Riftletics', accountType: 'ironman' as const },
  { rsn: 'Clogging', accountType: 'hardcore_ironman' as const },
  { rsn: 'Newcomer', accountType: null },
];

const renderExperience = (clanStats: ClanStats | null = stats) =>
  render(<JoinExperience members={members} stats={clanStats} />);

const nameField = () =>
  screen.getByRole('combobox', { name: /your runescape name/i });

beforeEach(() => {
  jest.clearAllMocks();
});

describe('JoinExperience', () => {
  it('opens on the welcome step', () => {
    renderExperience();

    expect(
      screen.getByRole('heading', { name: /welcome to the grotto/i }),
    ).toBeInTheDocument();
    expect(nameField()).toBeInTheDocument();
  });

  it('shows the clan at a glance', () => {
    renderExperience();

    expect(screen.getByText('130')).toBeInTheDocument();
    expect(screen.getByText('Members')).toBeInTheDocument();
  });

  it('drops the glance panel rather than showing zeroes when stats fail', () => {
    renderExperience(null);

    expect(screen.queryByText('Members')).not.toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: /welcome to the grotto/i }),
    ).toBeInTheDocument();
  });

  it('cannot start a scan with an empty name', () => {
    renderExperience();

    expect(screen.getByRole('button', { name: /look me up/i })).toBeDisabled();
  });

  describe('roster search', () => {
    it("shows a matching member's game-mode helmet beside their name", async () => {
      renderExperience();
      fireEvent.change(nameField(), { target: { value: 'rift' } });

      const option = await screen.findByRole('option', { name: /riftletics/i });

      // The badge renders as an <img> carrying the game mode as its alt text.
      expect(within(option).getByAltText(/ironman/i)).toBeInTheDocument();
    });

    it('gives a member with no known game mode no badge', async () => {
      renderExperience();
      fireEvent.change(nameField(), { target: { value: 'newcomer' } });

      const option = await screen.findByRole('option', { name: /newcomer/i });

      expect(within(option).queryByRole('img')).not.toBeInTheDocument();
    });

    it('fills the field from a picked suggestion', async () => {
      renderExperience();
      fireEvent.change(nameField(), { target: { value: 'rift' } });
      fireEvent.click(
        await screen.findByRole('option', { name: /riftletics/i }),
      );

      await waitFor(() => expect(nameField()).toHaveValue('Riftletics'));
    });
  });

  it('sends the player back to the welcome step when the name is not on the hiscores', async () => {
    scanHiscoresAction.mockResolvedValue({ data: { exists: false } });
    scanTempleAction.mockResolvedValue({ data: null });
    scanAchievementsAction.mockResolvedValue({ data: null });
    scanClanRecordAction.mockResolvedValue({ data: null });
    scanCollectionLogAction.mockResolvedValue({ data: null });

    renderExperience();
    fireEvent.change(nameField(), { target: { value: 'Nobody' } });
    fireEvent.click(screen.getByRole('button', { name: /look me up/i }));

    expect(
      await screen.findByText(
        /have never heard of "Nobody"/i,
        {},
        { timeout: 5000 },
      ),
    ).toBeInTheDocument();

    // Nothing was created, and the player was not moved on.
    expect(push).not.toHaveBeenCalled();
  });
});
