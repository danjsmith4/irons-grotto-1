// Plain render rather than the `test-utils` wrapper: onboarding deliberately
// mounts outside the app's providers (it has no nav and no profile modal), and
// wrapping it here would fetch `/api/viewer-accounts` for nothing.
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
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
const addPlayerAction = jest.fn<Promise<unknown>, [unknown]>();
const revealRankAction = jest.fn<Promise<unknown>, [unknown]>();
const publishRankSubmission = jest.fn<Promise<unknown>, [unknown]>();

jest.mock('./actions/add-player-action', () => ({
  addPlayerAction: (input: unknown) => addPlayerAction(input),
}));
jest.mock('./actions/reveal-rank-action', () => ({
  revealRankAction: (input: unknown) => revealRankAction(input),
}));

// A bound action: `.bind(null, currentRank, playerName)` returns the callable.
// Addressed relatively — Jest does not resolve the `@/` alias through a path
// segment containing brackets.
jest.mock('../player/[player]/actions/publish-rank-submission-action', () => ({
  publishRankSubmissionAction: {
    bind:
      (_: unknown, currentRank: unknown, playerName: unknown) =>
      (input: unknown) =>
        publishRankSubmission({ currentRank, playerName, input }),
  },
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

/**
 * Drives welcome → scan → confirm → reveal with everything resolving cleanly.
 *
 * The scan holds each row for a minimum dwell, so this genuinely takes a few
 * seconds of fake-free waiting; the tests using it carry a longer timeout.
 */
async function reachTheReveal(
  reveal: Partial<{
    rank: string;
    nextRank: string | null;
    points: number;
    rankThreshold: number;
    nextRankThreshold: number | null;
    canApply: boolean;
    throttleReason: null;
  }> = {},
) {
  scanHiscoresAction.mockResolvedValue({ data: { exists: true } });
  scanTempleAction.mockResolvedValue({
    data: {
      isTracked: true,
      didRegister: false,
      accountType: 'ironman',
      totalLevel: 2131,
      isMaxed: false,
      hasInfernal: true,
      ehb: 250,
      ehp: 969,
      hiscoresClogSlots: 430,
    },
  });
  scanCollectionLogAction.mockResolvedValue({
    data: {
      hasCollectionLog: true,
      clogSlots: 430,
      clogTotal: 1600,
      hasFangKit: false,
      ehc: 525,
    },
  });
  scanAchievementsAction.mockResolvedValue({
    data: {
      hasWikiSync: true,
      hasBlorva: false,
      hasQuiver: false,
      hasZukHelm: false,
      combatAchievementTier: 'Elite',
    },
  });
  scanClanRecordAction.mockResolvedValue({
    data: {
      joinDate: '2025-03-14T00:00:00.000Z',
      isClanMember: true,
      rsn: 'Riftletics',
    },
  });
  addPlayerAction.mockResolvedValue({ data: { playerName: 'Riftletics' } });
  revealRankAction.mockResolvedValue({
    data: {
      rank: 'Captain',
      nextRank: 'General',
      points: 13892,
      rankThreshold: 13000,
      nextRankThreshold: 16000,
      canApply: true,
      throttleReason: null,
      ...reveal,
    },
  });

  renderExperience();
  fireEvent.change(nameField(), { target: { value: 'Riftletics' } });
  fireEvent.click(lookMeUp());

  const setUp = await screen.findByRole(
    'button',
    { name: /set up my account/i },
    { timeout: 15_000 },
  );

  fireEvent.click(setUp);

  return screen.findByRole(
    'button',
    { name: /enter the grotto|continue anyway/i },
    { timeout: 15_000 },
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  checkNameAvailabilityAction.mockResolvedValue({
    data: { status: 'available' },
  });
  publishRankSubmission.mockResolvedValue({ data: { success: true } });
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

  describe('entering the Grotto', () => {
    jest.setTimeout(40_000);

    it('applies for the revealed rank, then goes in', async () => {
      const enter = await reachTheReveal();

      fireEvent.click(enter);

      await waitFor(() =>
        expect(publishRankSubmission).toHaveBeenCalledWith({
          // The row was created moments ago, so this is what it holds.
          currentRank: 'Unranked',
          playerName: 'Riftletics',
          input: { rank: 'Captain', totalPoints: 13892 },
        }),
      );

      await waitFor(() => expect(push).toHaveBeenCalledWith('/player/Riftletics'));
    });

    it('never applies on behalf of a main', async () => {
      // Approval assigns a real in-game and Discord rank off the ironman
      // ladder, which a main is not on. The server refuses it too.
      const enter = await reachTheReveal({ canApply: false, rank: 'Looter' });

      fireEvent.click(enter);

      await waitFor(() => expect(push).toHaveBeenCalledWith('/player/Riftletics'));
      expect(publishRankSubmission).not.toHaveBeenCalled();
    });

    it('lets the member in anyway when the application fails', async () => {
      publishRankSubmission.mockResolvedValue({
        serverError: 'Discord is unavailable.',
      });

      const enter = await reachTheReveal();

      fireEvent.click(enter);

      // Reported, not swallowed — and the account already exists, so the way in
      // stays open rather than stranding someone who has just signed up.
      expect(
        await screen.findByText(/Discord is unavailable/i),
      ).toBeInTheDocument();
      expect(push).not.toHaveBeenCalled();

      fireEvent.click(
        await screen.findByRole('button', { name: /continue anyway/i }),
      );

      await waitFor(() => expect(push).toHaveBeenCalledWith('/player/Riftletics'));
      // Not retried behind their back.
      expect(publishRankSubmission).toHaveBeenCalledTimes(1);
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

  describe('the clan minimum total level', () => {
    /** A scan that resolves cleanly, with the total level dictated per test. */
    function stubScanAtTotalLevel(
      hiscoresTotalLevel: number | null,
      templeTotalLevel: number | null,
    ) {
      scanHiscoresAction.mockResolvedValue({
        data: { exists: true, totalLevel: hiscoresTotalLevel },
      });
      scanTempleAction.mockResolvedValue({
        data: {
          isTracked: true,
          didRegister: true,
          accountType: 'ironman',
          totalLevel: templeTotalLevel,
          isMaxed: false,
          hasInfernal: false,
          ehb: 4,
          ehp: 30,
          hiscoresClogSlots: 120,
        },
      });
      scanCollectionLogAction.mockResolvedValue({
        data: {
          hasCollectionLog: true,
          clogSlots: 120,
          clogTotal: 1600,
          hasFangKit: false,
          ehc: 12,
        },
      });
      scanAchievementsAction.mockResolvedValue({
        data: {
          hasWikiSync: true,
          hasBlorva: false,
          hasQuiver: false,
          hasZukHelm: false,
          combatAchievementTier: null,
        },
      });
      scanClanRecordAction.mockResolvedValue({
        data: { joinDate: null, isClanMember: false, rsn: 'Riftletics' },
      });
    }

    const scan = () => {
      renderExperience();
      fireEvent.change(nameField(), { target: { value: 'Riftletics' } });
      fireEvent.click(lookMeUp());
    };

    it('names the requirement on the welcome step, before anyone types', () => {
      renderExperience();

      // Stated up front so nobody sits through the whole scan — including the
      // ten-second Temple registration — to learn a rule we could have led with.
      expect(screen.getByText(/1,500 total\s+level/i)).toBeInTheDocument();
    });

    it('sends an under-level account to the threshold scene instead of confirm', async () => {
      stubScanAtTotalLevel(1342, 1342);
      scan();

      expect(
        await screen.findByText(/158 to go/i, {}, { timeout: 15_000 }),
      ).toBeInTheDocument();

      // A destination, not a disabled button: there is no way to press on.
      expect(
        screen.queryByRole('button', { name: /set up my account/i }),
      ).not.toBeInTheDocument();
      expect(addPlayerAction).not.toHaveBeenCalled();
    });

    it('shows what the scan already found rather than only the shortfall', async () => {
      stubScanAtTotalLevel(1342, 1342);
      scan();

      await screen.findByText(/158 to go/i, {}, { timeout: 15_000 });

      // The trophy wall and the Discord invite are what make this an invitation
      // rather than a door — see `threshold-reveal.tsx`.
      expect(screen.getByRole('img', { name: /infernal cape/i })).toBeInTheDocument();
      expect(
        screen.getByRole('link', { name: /join our discord/i }),
      ).toBeInTheDocument();
      // The account was registered on Temple by the scan, which is theirs to keep.
      expect(
        screen.getByText(/added your account to TempleOSRS/i),
      ).toBeInTheDocument();
    });

    it('lets a member re-scan without retyping their name', async () => {
      stubScanAtTotalLevel(1342, 1342);
      scan();

      fireEvent.click(
        await screen.findByRole(
          'button',
          { name: /check again/i },
          { timeout: 15_000 },
        ),
      );

      // They levelled up in the meantime.
      stubScanAtTotalLevel(1520, 1520);

      expect(
        await screen.findByRole(
          'button',
          { name: /set up my account/i },
          { timeout: 15_000 },
        ),
      ).toBeInTheDocument();
    });

    it('takes the higher reading when a stale Temple disagrees with the hiscores', async () => {
      // Temple's figure is whatever the last sync uploaded. It must never be
      // the reason a qualifying member is turned away.
      stubScanAtTotalLevel(1600, 1400);
      scan();

      expect(
        await screen.findByRole(
          'button',
          { name: /set up my account/i },
          { timeout: 15_000 },
        ),
      ).toBeInTheDocument();
    });

    it('lets a player through when no source could report a level', async () => {
      // An unreachable third party is not evidence against the player.
      stubScanAtTotalLevel(null, null);
      scan();

      expect(
        await screen.findByRole(
          'button',
          { name: /set up my account/i },
          { timeout: 15_000 },
        ),
      ).toBeInTheDocument();
    });
  });
});
