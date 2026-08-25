// Plain render rather than the `test-utils` wrapper: onboarding deliberately
// mounts outside the app's providers (it has no nav and no profile modal), and
// wrapping it here would fetch `/api/viewer-accounts` for nothing.
import { fireEvent, render, screen } from '@testing-library/react';
import type { ClanStats } from '@/app/data-sources/fetch-clan-stats';
import { JoinExperience } from './join-experience';

const push = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
}));

/**
 * The actions are server actions, so they are stubbed wholesale. This spec is
 * about the experience mounting, the welcome step behaving, and the name
 * pre-flight — the scan's own decisions are covered by the pure functions in
 * `utils/`.
 */
const checkNameAvailabilityAction = jest.fn<Promise<unknown>, [unknown]>();
const scanHiscoresAction = jest.fn<Promise<unknown>, [unknown]>();
const scanTempleAction = jest.fn<Promise<unknown>, [unknown]>();
const scanCollectionLogAction = jest.fn<Promise<unknown>, [unknown]>();
const scanAchievementsAction = jest.fn<Promise<unknown>, [unknown]>();
const scanClanRecordAction = jest.fn<Promise<unknown>, [unknown]>();

jest.mock('./actions/check-name-availability-action', () => ({
  checkNameAvailabilityAction: (input: unknown) =>
    checkNameAvailabilityAction(input),
}));
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

const renderExperience = (clanStats: ClanStats | null = stats) =>
  render(<JoinExperience stats={clanStats} />);

const nameField = () =>
  screen.getByRole('textbox', { name: /your runescape name/i });

const lookMeUp = () => screen.getByRole('button', { name: /look me up/i });

/** Every scan step answering with nothing, for the cases that get that far. */
function stubScanWithNothing() {
  scanHiscoresAction.mockResolvedValue({ data: { exists: true } });
  scanTempleAction.mockResolvedValue({ data: null });
  scanCollectionLogAction.mockResolvedValue({ data: null });
  scanAchievementsAction.mockResolvedValue({ data: null });
  scanClanRecordAction.mockResolvedValue({ data: null });
}

beforeEach(() => {
  jest.clearAllMocks();
  checkNameAvailabilityAction.mockResolvedValue({
    data: { status: 'available' },
  });
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

    expect(lookMeUp()).toBeDisabled();
  });

  describe('the name field', () => {
    it('never suggests names', () => {
      // Not a search box. A member types their own name, and suggesting other
      // members offers up accounts that already exist and would be refused.
      renderExperience();
      fireEvent.change(nameField(), { target: { value: 'a' } });

      expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
      expect(screen.queryAllByRole('option')).toHaveLength(0);

      // And it is a plain field, not a combobox.
      expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    });

    it('leaves the browser out of it', () => {
      renderExperience();

      expect(nameField()).toHaveAttribute('autocomplete', 'off');
      expect(nameField()).toHaveAttribute('spellcheck', 'false');
    });
  });

  describe('the name pre-flight', () => {
    it('stops before the scan when the player already has this account', async () => {
      checkNameAvailabilityAction.mockResolvedValue({
        data: { status: 'yours', playerName: 'EclipseGoon' },
      });
      stubScanWithNothing();

      renderExperience();
      fireEvent.change(nameField(), { target: { value: 'eclipsegoon' } });
      fireEvent.click(lookMeUp());

      expect(
        await screen.findByText(/already set up EclipseGoon/i),
      ).toBeInTheDocument();

      // The whole point of the pre-flight: none of the scan ran, so nobody
      // waited on TempleOSRS to be told something we knew immediately.
      expect(scanHiscoresAction).not.toHaveBeenCalled();
      expect(scanTempleAction).not.toHaveBeenCalled();
    });

    it('offers a way into the account they already have', async () => {
      checkNameAvailabilityAction.mockResolvedValue({
        data: { status: 'yours', playerName: 'EclipseGoon' },
      });

      renderExperience();
      fireEvent.change(nameField(), { target: { value: 'eclipsegoon' } });
      fireEvent.click(lookMeUp());

      const link = await screen.findByRole('link', {
        name: /EclipseGoon/i,
      });

      expect(link).toHaveAttribute('href', '/player/EclipseGoon');
    });

    it('says so plainly when somebody else has the name, with no link', async () => {
      checkNameAvailabilityAction.mockResolvedValue({
        data: { status: 'taken', playerName: 'EclipseGoon' },
      });

      renderExperience();
      fireEvent.change(nameField(), { target: { value: 'eclipsegoon' } });
      fireEvent.click(lookMeUp());

      expect(
        await screen.findByText(/registered by another member/i),
      ).toBeInTheDocument();
      // Not their account to open.
      expect(screen.queryByRole('link')).not.toBeInTheDocument();
    });

    it('runs the scan when the name is free', async () => {
      stubScanWithNothing();

      renderExperience();
      fireEvent.change(nameField(), { target: { value: 'Newcomer' } });
      fireEvent.click(lookMeUp());

      expect(
        await screen.findByText(/finding you on the hiscores/i),
      ).toBeInTheDocument();
      expect(checkNameAvailabilityAction).toHaveBeenCalledWith({
        playerName: 'Newcomer',
      });
    });
  });

  it('sends the player back to the welcome step when the name is not on the hiscores', async () => {
    stubScanWithNothing();
    scanHiscoresAction.mockResolvedValue({ data: { exists: false } });

    renderExperience();
    fireEvent.change(nameField(), { target: { value: 'Nobody' } });
    fireEvent.click(lookMeUp());

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
