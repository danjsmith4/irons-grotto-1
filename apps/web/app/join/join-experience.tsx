'use client';

import Image from 'next/image';
import { useCallback, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { AccountTypeBadge } from '@/app/components/account-type-badge';
import type { ClanStats } from '@/app/data-sources/fetch-clan-stats';
import {
  AccountTypeChoice,
  accountTypeChoiceLabels,
} from '@/app/schemas/staff';
import { clientConstants } from '@/config/constants.client';
import { publishRankSubmissionAction } from '@/app/player/[player]/actions/publish-rank-submission-action';
import { addPlayerAction } from './actions/add-player-action';
import { checkNameAvailabilityAction } from './actions/check-name-availability-action';
import { revealRankAction, type RankReveal } from './actions/reveal-rank-action';
import { scanAchievementsAction } from './actions/scan-achievements-action';
import { scanClanRecordAction } from './actions/scan-clan-record-action';
import { scanCollectionLogAction } from './actions/scan-collection-log-action';
import { scanHiscoresAction } from './actions/scan-hiscores-action';
import { scanTempleAction } from './actions/scan-temple-action';
import { RankReveal as RankRevealScene } from './components/rank-reveal';
import { RsnField } from './components/rsn-field';
import { StatusIndicator, type StepStatus } from './components/status-indicator';
import { ThresholdReveal } from './components/threshold-reveal';
import { TrophyWall } from './components/trophy-wall';
import {
  type AchievementScan,
  type ClanRecordScan,
  type CollectionLogScan,
  type HiscoresScan,
  type TempleScan,
} from './scan-types';
import { buildPlayerStats } from './utils/build-player-stats';
import { collectValidationErrors } from './utils/collect-validation-errors';
import {
  canPassCollectionLogGate,
  resolveCollectionLogState,
} from './utils/resolve-collection-log-state';
import { resolveEarnedAchievements } from './utils/resolve-earned-achievements';
import {
  canPassTotalLevelGate,
  resolveTotalLevelState,
} from './utils/resolve-total-level-state';
import { minimumJoinTotalLevel } from '@/config/clan-requirements';
import styles from './join.module.css';

interface JoinExperienceProps {
  stats: ClanStats | null;
}

/**
 * `threshold` is where the scan ends for an account under the clan's minimum
 * total level — a destination of its own rather than a disabled button on
 * `confirm`. See `components/threshold-reveal.tsx`.
 */
type Phase =
  | 'welcome'
  | 'scanning'
  | 'confirm'
  | 'creating'
  | 'reveal'
  | 'threshold';

type StepKey =
  | 'hiscores'
  | 'temple'
  | 'collectionLog'
  | 'achievements'
  | 'clanRecord';

/**
 * The order the rows tick over in, which is also the order they read in: who
 * are you, are we tracking you, what have you logged, what have you done, and
 * when did you join us.
 */
const stepOrder: StepKey[] = [
  'hiscores',
  'temple',
  'collectionLog',
  'achievements',
  'clanRecord',
];

const stepLabels: Record<StepKey, string> = {
  hiscores: 'Finding you on the hiscores',
  temple: 'Reading your TempleOSRS profile',
  collectionLog: 'Syncing your collection log',
  achievements: 'Checking your combat achievements',
  clanRecord: 'Looking up your clan record',
};

/**
 * How long a row stays spinning at minimum.
 *
 * The requests are real and run in parallel, so several of them are already
 * resolved by the time their row's turn comes round. Without a floor they would
 * all tick in the same frame and the sequence — the thing that tells the player
 * what is being checked — would be invisible.
 */
const minimumDwellMs = 520;

const idleSteps: Record<StepKey, StepStatus> = {
  hiscores: 'idle',
  temple: 'idle',
  collectionLog: 'idle',
  achievements: 'idle',
  clanRecord: 'idle',
};

const compact = new Intl.NumberFormat('en', {
  notation: 'compact',
  maximumFractionDigits: 1,
});

const glanceValue = (n: number) =>
  n >= 10000 ? compact.format(n) : n.toLocaleString();

const wait = (ms: number) =>
  new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });

export function JoinExperience({ stats }: JoinExperienceProps) {
  const router = useRouter();

  const [phase, setPhase] = useState<Phase>('welcome');
  const [rsn, setRsn] = useState('');
  const [nameError, setNameError] = useState<string | null>(null);
  /** A way out of the name error, when there is one — never just a dead end. */
  const [nameErrorLink, setNameErrorLink] = useState<{
    href: string;
    label: string;
  } | null>(null);
  const [isCheckingName, setIsCheckingName] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [steps, setSteps] = useState<Record<StepKey, StepStatus>>(idleSteps);
  const [hiscores, setHiscores] = useState<HiscoresScan | null>(null);
  const [temple, setTemple] = useState<TempleScan | null>(null);
  const [collectionLog, setCollectionLog] = useState<CollectionLogScan | null>(
    null,
  );
  const [achievements, setAchievements] = useState<AchievementScan | null>(null);
  const [clanRecord, setClanRecord] = useState<ClanRecordScan | null>(null);
  const [revealedSources, setRevealedSources] = useState<Set<string>>(
    new Set(),
  );

  const [joinDate, setJoinDate] = useState<Date>(new Date());
  const [isJoinDateKnown, setIsJoinDateKnown] = useState(false);
  const [isEditingJoinDate, setIsEditingJoinDate] = useState(false);

  const [isMobileOnly, setIsMobileOnly] = useState(false);
  const [isRecheckingLog, setIsRecheckingLog] = useState(false);

  const [accountTypeChoice, setAccountTypeChoice] =
    useState<AccountTypeChoice | null>(null);
  const [gimGroupName, setGimGroupName] = useState('');
  const [gimGroupError, setGimGroupError] = useState<string | null>(null);

  const [reveal, setReveal] = useState<RankReveal | null>(null);
  const [isApplying, setIsApplying] = useState(false);
  const [applyError, setApplyError] = useState<string | null>(null);

  /** The name the scan actually ran for — never the raw input afterwards. */
  const scannedName = useRef('');

  const setStep = useCallback((key: StepKey, status: StepStatus) => {
    setSteps((current) => ({ ...current, [key]: status }));
  }, []);

  /**
   * Runs the scan.
   *
   * Everything that can start immediately does. The collection log deliberately
   * waits for the Temple step, because that step is what *registers* an account
   * Temple has never seen — asking for a log before that has happened would
   * reliably get nothing back and report it as a missing log.
   */
  const runScan = useCallback(
    async (name: string) => {
      const trimmed = name.trim();

      if (!trimmed) {
        setNameError('Enter your RuneScape name to get started.');

        return;
      }

      scannedName.current = trimmed;
      setNameError(null);
      setNameErrorLink(null);
      setSubmitError(null);

      /*
       * Pre-flight: is this name already set up?
       *
       * One indexed lookup, before any of the theatre. Finding out at the end
       * instead meant a member who already had an account sat through the whole
       * scan — including the TempleOSRS registration, which deliberately waits
       * ten seconds — only to be told something we could have said immediately.
       */
      setIsCheckingName(true);

      const availability = await checkNameAvailabilityAction({
        playerName: trimmed,
      });

      setIsCheckingName(false);

      if (availability?.data && availability.data.status !== 'available') {
        const { status, playerName } = availability.data;

        if (status === 'yours') {
          setNameError(`You've already set up ${playerName}.`);
          setNameErrorLink({
            href: `/player/${encodeURIComponent(playerName)}`,
            label: `Open ${playerName}'s rank sheet.`,
          });
        } else {
          setNameError(
            `${playerName} is already registered by another member. If that account is yours, ask a moderator to sort it out.`,
          );
        }

        return;
      }

      setSteps(idleSteps);
      setHiscores(null);
      setRevealedSources(new Set());
      setPhase('scanning');

      const hiscoresPromise = scanHiscoresAction({ playerName: trimmed });
      const templePromise = scanTempleAction({ playerName: trimmed });
      const achievementsPromise = scanAchievementsAction({
        playerName: trimmed,
      });
      const clanRecordPromise = scanClanRecordAction({ playerName: trimmed });

      // --- hiscores -------------------------------------------------------
      setStep('hiscores', 'running');
      const [hiscores] = await Promise.all([
        hiscoresPromise,
        wait(minimumDwellMs),
      ]);

      if (hiscores?.data && !hiscores.data.exists) {
        setStep('hiscores', 'fail');
        await wait(700);
        setPhase('welcome');
        setNameError(
          `The hiscores have never heard of "${trimmed}". Check the spelling and spacing against the game.`,
        );

        return;
      }

      const hiscoresData = hiscores?.data ?? null;

      setHiscores(hiscoresData);
      setStep('hiscores', 'ok');

      // --- temple ---------------------------------------------------------
      setStep('temple', 'running');
      const [templeResult] = await Promise.all([
        templePromise,
        wait(minimumDwellMs),
      ]);
      const templeData = templeResult?.data ?? null;

      setTemple(templeData);
      setStep('temple', templeData?.isTracked ? 'ok' : 'warn');
      setRevealedSources((current) => new Set(current).add('temple'));

      // --- collection log -------------------------------------------------
      setStep('collectionLog', 'running');
      const [collectionLogResult] = await Promise.all([
        scanCollectionLogAction({ playerName: trimmed }),
        wait(minimumDwellMs),
      ]);
      const collectionLogData = collectionLogResult?.data ?? null;

      setCollectionLog(collectionLogData);
      setStep(
        'collectionLog',
        collectionLogData?.hasCollectionLog ? 'ok' : 'warn',
      );
      setRevealedSources((current) => new Set(current).add('collectionLog'));

      // --- combat achievements --------------------------------------------
      setStep('achievements', 'running');
      const [achievementsResult] = await Promise.all([
        achievementsPromise,
        wait(minimumDwellMs),
      ]);
      const achievementsData = achievementsResult?.data ?? null;

      setAchievements(achievementsData);
      setStep('achievements', achievementsData?.hasWikiSync ? 'ok' : 'warn');
      setRevealedSources((current) => new Set(current).add('achievements'));

      // --- clan record ----------------------------------------------------
      setStep('clanRecord', 'running');
      const [clanRecordResult] = await Promise.all([
        clanRecordPromise,
        wait(minimumDwellMs),
      ]);
      const clanRecordData = clanRecordResult?.data ?? null;

      setClanRecord(clanRecordData);
      setStep('clanRecord', clanRecordData?.isClanMember ? 'ok' : 'warn');

      if (clanRecordData?.joinDate) {
        setJoinDate(new Date(clanRecordData.joinDate));
        setIsJoinDateKnown(true);
      } else {
        setJoinDate(new Date());
        setIsJoinDateKnown(false);
      }

      // The clan list's casing is the canonical one.
      if (clanRecordData?.rsn) {
        scannedName.current = clanRecordData.rsn;
        setRsn(clanRecordData.rsn);
      }

      await wait(650);

      /*
       * The clan's minimum total level, judged on both readings the scan just
       * took: the hiscores figure (live) and Temple's (a synced snapshot that
       * can lag). Either being missing is not evidence against the player —
       * `resolveTotalLevelState` returns `unknown` and this passes.
       *
       * Falling short is its own destination rather than a disabled button on
       * the confirm screen: a total level is weeks of play, and a screen that
       * reads as a rejection is one nobody comes back from.
       */
      const totalLevelState = resolveTotalLevelState(
        hiscoresData?.totalLevel ?? null,
        templeData?.totalLevel ?? null,
      );

      setPhase(canPassTotalLevelGate(totalLevelState) ? 'confirm' : 'threshold');
    },
    [setStep],
  );

  /** Which headline achievements have been settled *and* revealed. */
  const earnedAchievements = useMemo(
    () =>
      resolveEarnedAchievements(
        { temple, collectionLog, achievements },
        revealedSources,
      ),
    [revealedSources, temple, collectionLog, achievements],
  );

  const collectionLogState = resolveCollectionLogState(temple, collectionLog);

  /**
   * Re-derived for the render, from the same rule `runScan` used to pick the
   * phase — the threshold scene needs the level and the shortfall to show them.
   */
  const totalLevelState = resolveTotalLevelState(
    hiscores?.totalLevel ?? null,
    temple?.totalLevel ?? null,
  );

  /** The headline numbers shown beside the name, as their sources land. */
  const playerStats = useMemo(
    () => buildPlayerStats(temple, collectionLog),
    [temple, collectionLog],
  );

  /** Temple could not settle the game mode, so the player has to say. */
  const needsAccountType = phase !== 'welcome' && temple?.accountType == null;

  const isAccountTypeAnswered =
    !needsAccountType ||
    (accountTypeChoice !== null &&
      (accountTypeChoice !== 'group_ironman' || gimGroupName.trim().length > 0));

  const canContinue =
    canPassCollectionLogGate(collectionLogState, isMobileOnly) &&
    isAccountTypeAnswered;

  async function recheckCollectionLog() {
    setIsRecheckingLog(true);
    setStep('collectionLog', 'running');

    const result = await scanCollectionLogAction({
      playerName: scannedName.current,
    });

    setCollectionLog(result?.data ?? null);
    setStep('collectionLog', result?.data?.hasCollectionLog ? 'ok' : 'warn');
    setIsRecheckingLog(false);
  }

  async function createAccount() {
    setPhase('creating');
    setSubmitError(null);
    setGimGroupError(null);

    const created = await addPlayerAction({
      playerName: scannedName.current,
      joinDate,
      isMobileOnly,
      ...(needsAccountType && accountTypeChoice
        ? {
            accountType: accountTypeChoice,
            ...(accountTypeChoice === 'group_ironman'
              ? { gimGroupName: gimGroupName.trim() }
              : {}),
          }
        : {}),
    });

    const validationErrors = created?.validationErrors;

    // The group-name failure gets its own slot, because it belongs beside the
    // field it is about and carries instructions the player has to follow.
    const groupNameErrors = collectValidationErrors(
      validationErrors?.gimGroupName ? { gimGroupName: validationErrors.gimGroupName } : null,
    );

    if (groupNameErrors) {
      setGimGroupError(groupNameErrors);
      setPhase('confirm');

      return;
    }

    // Everything else the server refused, whichever field it came from. Never
    // fall through to a generic message while a specific one is in hand.
    const otherErrors = collectValidationErrors(validationErrors);

    if (otherErrors) {
      setSubmitError(otherErrors);
      setPhase('confirm');

      return;
    }

    if (created?.serverError || !created?.data) {
      setSubmitError(
        created?.serverError ??
          'Something went wrong setting up your account. Try again in a moment.',
      );
      setPhase('confirm');

      return;
    }

    const playerName = created.data.playerName;

    scannedName.current = playerName;

    const revealResult = await revealRankAction({ playerName });

    if (!revealResult?.data) {
      // The account exists either way — the reveal is the celebration, not the
      // outcome, so a failure here goes straight to the calculator rather than
      // stranding a member who has just signed up.
      router.push(`/player/${encodeURIComponent(playerName)}`);

      return;
    }

    setReveal(revealResult.data);
    setPhase('reveal');
  }

  /**
   * "Enter the Grotto" — applies for the revealed rank, then goes in.
   *
   * The reveal is not a grant, so leaving onboarding without applying meant a
   * member had just been shown a rank and then had to go and ask for it from a
   * menu. Applying here is the natural end of the sequence: the submission is
   * the same one `publishRankSubmissionAction` creates from the calculator, so
   * a moderator sees it exactly as they see every other application.
   *
   * ⚠️ A **main never applies.** `publishRankSubmissionAction` refuses them
   * server-side (`canApplyForRank`), and it is right to — approval assigns a
   * real in-game and Discord clan rank off the ironman ladder. They go straight
   * through to the calculator, which is theirs to use like anyone's.
   *
   * A failed application does not block the way in. The account exists either
   * way, so the failure is reported and the button becomes a plain "Continue
   * anyway" — the calculator's own "Apply for promotion" is still there, which
   * makes it recoverable rather than silently lost.
   */
  async function enterTheGrotto() {
    const playerName = scannedName.current;
    const goIn = () => router.push(`/player/${encodeURIComponent(playerName)}`);

    if (!reveal?.canApply || applyError) {
      goIn();

      return;
    }

    setIsApplying(true);
    setApplyError(null);

    const submitted = await publishRankSubmissionAction.bind(
      null,
      // The row was created moments ago, so this is what it holds.
      'Unranked',
      playerName,
    )({ rank: reveal.rank, totalPoints: Math.round(reveal.points) });

    setIsApplying(false);

    if (submitted?.serverError ?? submitted?.validationErrors) {
      setApplyError(
        submitted.serverError ??
          'We could not send your application just now. You can apply from your calculator instead.',
      );

      return;
    }

    goIn();
  }

  // ---------------------------------------------------------------- welcome

  if (phase === 'welcome') {
    return (
      <main className={styles.shell}>
        <div className={styles.stage}>
          <section className={styles.welcome}>
            <div className={styles.crest}>
              <Image
                className={styles.crestMark}
                src="/L1.png"
                alt=""
                width={44}
                height={44}
              />
              <p className={styles.eyebrow}>Irons&apos; Grotto</p>
            </div>

            <div>
              <h1 className={styles.title}>Welcome to the Grotto.</h1>
              <p className={styles.subtitle} style={{ marginTop: '0.9rem' }}>
                Tell us your RuneScape name and we&apos;ll pull the rest
                together: your stats, your collection log, and the rank
                they add up to.
              </p>
              {/*
                The clan's one entry requirement, said before they type rather
                than after the scan. Stated as a fact of the place, alongside
                the numbers below it — not as a warning, and not as something
                to be got past.
              */}
              <p className={styles.requirement}>
                You need {minimumJoinTotalLevel.toLocaleString()} total level to
                join.
              </p>
            </div>

            {stats && (
              <div className={styles.glance}>
                <div className={styles.glanceCell}>
                  <span className={styles.glanceValue}>
                    {glanceValue(stats.memberCount)}
                  </span>
                  <span className={styles.glanceLabel}>Members</span>
                </div>
                <div className={styles.glanceCell}>
                  <span className={styles.glanceValue}>
                    {glanceValue(stats.totalClogSlots)}
                  </span>
                  <span className={styles.glanceLabel}>Clog slots</span>
                </div>
                <div className={styles.glanceCell}>
                  <span className={styles.glanceValue}>
                    {glanceValue(stats.totalPets)}
                  </span>
                  <span className={styles.glanceLabel}>Pets</span>
                </div>
                <div className={styles.glanceCell}>
                  <span className={styles.glanceValue}>
                    {glanceValue(stats.infernalCount)}
                  </span>
                  <span className={styles.glanceLabel}>Infernals</span>
                </div>
              </div>
            )}

            <RsnField
              value={rsn}
              onChange={(value) => {
                setRsn(value);
                setNameError(null);
                setNameErrorLink(null);
              }}
              onSubmit={runScan}
              error={nameError}
              errorLink={nameErrorLink}
              disabled={isCheckingName}
            />

            <div className={styles.actions}>
              <button
                type="button"
                className={styles.primary}
                onClick={() => runScan(rsn)}
                disabled={!rsn.trim() || isCheckingName}
              >
                {isCheckingName ? 'Checking…' : 'Look me up'}
              </button>
              <button
                type="button"
                className={styles.link}
                onClick={() => router.push('/dashboard')}
              >
                Back to dashboard
              </button>
            </div>
          </section>
        </div>
      </main>
    );
  }

  // -------------------------------------------------------------- threshold

  if (phase === 'threshold' && totalLevelState.status === 'short') {
    return (
      <main className={styles.shell}>
        <div className={styles.stage}>
          <ThresholdReveal
            playerName={scannedName.current}
            totalLevel={totalLevelState.totalLevel}
            shortfall={totalLevelState.shortfall}
            didRegisterOnTemple={temple?.didRegister ?? false}
            earned={earnedAchievements}
            settledSources={revealedSources.size}
            isRechecking={isCheckingName}
            onRecheck={() => runScan(scannedName.current)}
          />
        </div>
      </main>
    );
  }

  // ----------------------------------------------------------------- reveal

  if (phase === 'reveal' && reveal) {
    return (
      <main className={styles.shell}>
        <div className={styles.stage}>
          <RankRevealScene
            playerName={scannedName.current}
            reveal={reveal}
            isApplying={isApplying}
            applyError={applyError}
            onContinue={enterTheGrotto}
          />
        </div>
      </main>
    );
  }

  // --------------------------------------------------- scanning / confirming

  const isConfirming = phase === 'confirm' || phase === 'creating';

  return (
    <main className={styles.shell}>
      <div className={`${styles.stage} ${styles.stageWide}`}>
        <section className={styles.scan}>
          <div>
            <p className={styles.eyebrow}>
              {isConfirming ? 'Here’s what we found' : 'Looking you up'}
            </p>
            {/*
              The game-mode badge leads the name, exactly as it does in game
              and on the leaderboard. It appears when the Temple step resolves,
              which is the moment we learn what kind of account this is — the
              name settling across is the feedback, not a layout jump.
            */}
            <div className={styles.nameRow}>
              <h1 className={styles.nameHeading}>
                {temple?.accountType && (
                  <span className={styles.nameBadge}>
                    <AccountTypeBadge
                      accountType={temple.accountType}
                      size={26}
                    />
                  </span>
                )}
                {scannedName.current || rsn}
              </h1>
              {/*
                The headline numbers, filling in beside the name as the source
                that settles each one lands. Total level, EHB and EHP come from
                the Temple step; EHC rides along with the collection log, which
                is the only endpoint that reports it. A figure that has not
                arrived is left out rather than shown as a zero.
              */}
              {playerStats.length > 0 && (
                <dl className={styles.nameStats}>
                  {playerStats.map(({ label, value }) => (
                    <div key={label} className={styles.nameStat}>
                      <dt>{label}</dt>
                      <dd>{value}</dd>
                    </div>
                  ))}
                </dl>
              )}
            </div>
          </div>

          <div className={styles.steps}>
            {stepOrder.map((key) => (
              <div
                key={key}
                className={`${styles.step} ${
                  steps[key] === 'idle' ? styles.stepPending : ''
                }`}
              >
                <StatusIndicator status={steps[key]} />
                <span className={styles.stepLabel}>{stepLabels[key]}</span>
                <span className={styles.stepNote}>
                  {key === 'temple' &&
                    steps.temple !== 'idle' &&
                    steps.temple !== 'running' &&
                    (temple?.didRegister
                      ? 'added to Temple'
                      : temple?.isTracked
                        ? 'tracked'
                        : 'not tracked')}
                  {key === 'collectionLog' &&
                    collectionLog?.clogSlots != null &&
                    `${collectionLog.clogSlots} slots`}
                  {key === 'achievements' &&
                    achievements?.combatAchievementTier &&
                    achievements.combatAchievementTier}
                  {key === 'clanRecord' &&
                    steps.clanRecord !== 'idle' &&
                    steps.clanRecord !== 'running' &&
                    (clanRecord?.isClanMember ? 'in the clan' : 'no record')}
                </span>
              </div>
            ))}
          </div>

          <TrophyWall
            earned={earnedAchievements}
            settledSources={revealedSources.size}
          />

          {isConfirming && (
            <>
              {/*
                Join date — a finding, not a field, and deliberately quiet.

                It was a bordered card with the date in display type, which gave
                a settled fact the same weight as the one blocking decision on
                the screen, and arrived with a thump. It is now a label, the
                date, and fine print: the size of a thing you glance at and move
                past, with the way to correct it in reach if you don't.
              */}
              <div className={styles.joined}>
                <p className={styles.joinedLabel}>Joined the clan</p>
                <p className={styles.joinedValue}>
                  {format(joinDate, 'd MMMM yyyy')}
                </p>
                {isEditingJoinDate ? (
                  <div className={styles.joinedEdit}>
                    <input
                      type="date"
                      className={styles.joinedInput}
                      aria-label="Join date"
                      max={format(new Date(), 'yyyy-MM-dd')}
                      value={format(joinDate, 'yyyy-MM-dd')}
                      onChange={(event) => {
                        const next = new Date(event.target.value);

                        if (!Number.isNaN(next.getTime())) {
                          setJoinDate(next);
                          setIsJoinDateKnown(false);
                        }
                      }}
                    />
                    <button
                      type="button"
                      className={styles.joinedCta}
                      onClick={() => setIsEditingJoinDate(false)}
                    >
                      Done
                    </button>
                  </div>
                ) : (
                  <p className={styles.joinedNote}>
                    {isJoinDateKnown
                      ? 'From the clan member list. Your points scale from it.'
                      : 'No record of you on the clan list yet, so we’ve assumed today.'}{' '}
                    <button
                      type="button"
                      className={styles.joinedCta}
                      onClick={() => setIsEditingJoinDate(true)}
                    >
                      Is this wrong? Change it
                    </button>
                  </p>
                )}
              </div>

              {/* -------------- collection log gate (blocking) -------------- */}
              {(collectionLogState.status === 'missing' ||
                collectionLogState.status === 'behind') && (
                <div className={`${styles.card} ${styles.warnCard}`}>
                  <p className={styles.eyebrow}>
                    {collectionLogState.status === 'behind'
                      ? 'Your collection log is out of date'
                      : 'We can’t see your collection log'}
                  </p>
                  <p className={styles.cardNote}>
                    In game, open your <strong>collection log</strong> and press
                    the <strong>TempleOSRS sync button</strong> in the top-right
                    of the interface. That uploads your log to TempleOSRS, which
                    is where every collection log point on this site comes from.
                    {collectionLogState.status === 'behind' && (
                      <>
                        {' '}
                        Temple has {collectionLogState.templeSlots} slots for
                        you; the hiscores say {collectionLogState.hiscoresSlots}.
                      </>
                    )}
                  </p>
                  <div className={styles.cardActions}>
                    <button
                      type="button"
                      className={styles.primary}
                      onClick={recheckCollectionLog}
                      disabled={isRecheckingLog}
                    >
                      {isRecheckingLog ? 'Checking…' : 'I’ve synced — check again'}
                    </button>
                    <a
                      className={styles.link}
                      href={`${clientConstants.temple.baseUrl}/player/collection-log.php?player=${encodeURIComponent(scannedName.current)}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      View on TempleOSRS
                    </a>
                  </div>
                  <label className={styles.cardNote}>
                    <input
                      type="checkbox"
                      checked={isMobileOnly}
                      onChange={(event) =>
                        setIsMobileOnly(event.target.checked)
                      }
                      style={{ marginRight: '0.5rem' }}
                    />
                    I play on mobile only, so I can&apos;t sync — set my account
                    up without it.
                  </label>
                </div>
              )}

              {/* ---------------- account type, only if needed ------------- */}
              {needsAccountType && (
                <div className={styles.card}>
                  <p className={styles.eyebrow}>What kind of account is this?</p>
                  <p className={styles.cardNote}>
                    TempleOSRS can&apos;t tell a group ironman from a main until
                    the group is tracked there, so we have to ask.
                  </p>
                  <div className={styles.choices}>
                    {AccountTypeChoice.options.map((option) => (
                      <button
                        key={option}
                        type="button"
                        className={`${styles.choice} ${
                          accountTypeChoice === option
                            ? styles.choiceSelected
                            : ''
                        }`}
                        aria-pressed={accountTypeChoice === option}
                        onClick={() => setAccountTypeChoice(option)}
                      >
                        {accountTypeChoiceLabels[option]}
                      </button>
                    ))}
                  </div>
                  {accountTypeChoice === 'group_ironman' && (
                    <>
                      <input
                        className={styles.textInput}
                        maxLength={12}
                        placeholder="Group name"
                        aria-label="Group name"
                        value={gimGroupName}
                        onChange={(event) =>
                          setGimGroupName(event.target.value)
                        }
                      />
                      {gimGroupError && (
                        <p className={styles.fieldError}>{gimGroupError}</p>
                      )}
                      {/*
                        A real link, always — not a bare URL inside the error
                        text. Getting the group onto Temple's GIM tracking is
                        the only thing that lets Temple tell a group ironman
                        from a main, so it is the one action this step can ask
                        for, and it should be one click rather than a copy and
                        paste.
                      */}
                      <p className={styles.cardNote}>
                        Your group has to be on{' '}
                        <a
                          className={styles.inlineLink}
                          href={clientConstants.temple.gimTrackingUrl}
                          target="_blank"
                          rel="noreferrer"
                        >
                          TempleOSRS group tracking
                        </a>{' '}
                        before Temple can tell you apart from a main.
                      </p>
                    </>
                  )}
                </div>
              )}

              {submitError && <p className={styles.fieldError}>{submitError}</p>}

              <div className={styles.actions}>
                <button
                  type="button"
                  className={styles.primary}
                  onClick={createAccount}
                  disabled={!canContinue || phase === 'creating'}
                >
                  {phase === 'creating'
                    ? 'Setting things up…'
                    : 'Set up my account'}
                </button>
                <button
                  type="button"
                  className={styles.link}
                  onClick={() => {
                    setPhase('welcome');
                    setSteps(idleSteps);
                  }}
                  disabled={phase === 'creating'}
                >
                  Use a different name
                </button>
              </div>
            </>
          )}
        </section>
      </div>
    </main>
  );
}
