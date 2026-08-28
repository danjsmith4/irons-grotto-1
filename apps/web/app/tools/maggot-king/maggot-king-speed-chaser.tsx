'use client';

import { useMemo, useState } from 'react';
import { StopwatchIcon } from '@radix-ui/react-icons';
import { SectionHeader } from '@/app/components/section-header';
import {
  flatPaceTicks,
  formatTickDelta,
  formatTicks,
  parseKillTime,
  speedChaserBudgetTicks,
  speedChaserKillCount,
  summariseAttempt,
  type SpeedChaserSummary,
} from './utils/speed-chaser';
import styles from './maggot-king.module.css';

/** The flat-pace gridlines on the budget bar: every 1:48.0 short of the end. */
const paceGridlines = Array.from(
  { length: speedChaserKillCount - 1 },
  (_, index) => (index + 1) * flatPaceTicks,
);

const killSlots = Array.from(
  { length: speedChaserKillCount },
  (_, index) => index,
);

function plural(count: number, noun: string) {
  return `${count} ${noun}${count === 1 ? '' : 's'}`;
}

/**
 * Needing less than the flat pace from here means the time already spent has to
 * be paid back — that is the point at which the number is worth colouring.
 */
function requiredAverageTone(ticks: number | null) {
  if (ticks === null || ticks <= 0) {
    return 'idle' as const;
  }

  return ticks < flatPaceTicks ? ('bad' as const) : ('good' as const);
}

/**
 * One line under the field, carrying whichever of three things is true: the
 * parse error, the tick the typed time will be scored as, or how to type one.
 */
function EntryHint({
  error,
  previewTicks,
}: {
  error: string | null;
  previewTicks: number | null;
}) {
  if (error !== null) {
    return <span className={styles.entryError}>{error}</span>;
  }

  if (previewTicks !== null) {
    return (
      <>
        Scores as{' '}
        <span className={styles.entryPreview}>{formatTicks(previewTicks)}</span>{' '}
        — {plural(previewTicks, 'tick')}
      </>
    );
  }

  return <>As the game writes it: 1:42.60, 1:42.6 or 102.6. Enter to log.</>;
}

interface StatProps {
  label: string;
  value: string;
  sub: string;
  tone?: 'good' | 'bad' | 'idle';
}

function Stat({ label, value, sub, tone }: StatProps) {
  const toneClass = {
    good: styles.toneGood,
    bad: styles.toneBad,
    idle: styles.toneIdle,
  }[tone ?? 'idle'];

  return (
    <div className={styles.stat}>
      <span className={styles.statLabel}>{label}</span>
      <span
        className={`${styles.statValue} ${tone ? toneClass : ''}`}
        aria-label={label.toLowerCase()}
      >
        {value}
      </span>
      <span className={styles.statSub}>{sub}</span>
    </div>
  );
}

/**
 * The nine minutes drawn to scale, one block per logged kill. Reading the shape
 * of an attempt — a slow first kill, three tight ones, how much bar is left —
 * is faster than reading five numbers.
 */
function BudgetBar({
  killTicks,
  summary,
}: {
  killTicks: readonly number[];
  summary: SpeedChaserSummary;
}) {
  // An overrun still has to be visible, so the bar stretches to fit it rather
  // than clipping at nine minutes. Once it does, the track no longer *is* the
  // budget, so the nine-minute line has to be drawn and labelled explicitly —
  // otherwise the end of the bar reads as the limit it just blew past.
  const isOverBudget = summary.elapsedTicks > speedChaserBudgetTicks;
  const scale = Math.max(speedChaserBudgetTicks, summary.elapsedTicks);
  const budgetOffset = (speedChaserBudgetTicks / scale) * 100;
  let consumed = 0;

  return (
    <div className={styles.budget}>
      <div
        className={styles.budgetTrack}
        role="img"
        aria-label={`${formatTicks(summary.elapsedTicks)} of ${formatTicks(
          speedChaserBudgetTicks,
        )} used`}
      >
        <div className={styles.budgetFill}>
          {killTicks.map((ticks, index) => {
            consumed += ticks;

            const isOver = consumed > speedChaserBudgetTicks;
            const isAlternate = index % 2 === 1;

            return (
              <span
                // Kills are append-only and never reordered, so their position
                // in the attempt is their identity.
                key={index}
                className={`${styles.segment} ${
                  isOver ? styles.segmentOver : ''
                } ${!isOver && isAlternate ? styles.segmentAlt : ''}`}
                style={{ width: `${(ticks / scale) * 100}%` }}
              />
            );
          })}
        </div>
        {paceGridlines.map((ticks) => (
          <span
            key={ticks}
            className={styles.paceMark}
            style={{ left: `${(ticks / scale) * 100}%` }}
          />
        ))}
        {isOverBudget && (
          <span
            className={styles.budgetMark}
            style={{ left: `${budgetOffset}%` }}
          />
        )}
      </div>
      <div className={styles.budgetScale}>
        <span>00:00.0</span>
        {isOverBudget && (
          <span
            className={styles.budgetScaleLimit}
            style={{ left: `${budgetOffset}%` }}
          >
            {formatTicks(speedChaserBudgetTicks)}
          </span>
        )}
        {/* On a narrow overrun the nine-minute label lands almost on top of the
            total, and the limit is the one worth reading — the total is already
            the first stat tile. */}
        {(!isOverBudget || budgetOffset < 85) && (
          <span>{formatTicks(scale)}</span>
        )}
      </div>
    </div>
  );
}

function Verdict({ summary }: { summary: SpeedChaserSummary }) {
  const {
    status,
    killsLogged,
    killsRemaining,
    elapsedTicks,
    remainingTicks,
    requiredAverageTicks,
    averageKillTicks,
    projectedTicks,
    bankedTicks,
  } = summary;

  const figure = (ticks: number) => (
    <span className={styles.verdictFigure}>{formatTicks(ticks)}</span>
  );

  if (status === 'not-started') {
    return (
      <p className={`${styles.verdict} ${styles.verdictGood}`} role="status">
        Five kills inside {figure(speedChaserBudgetTicks)}. Split evenly that is{' '}
        {figure(flatPaceTicks)} each — log a kill as it lands and this
        re-averages what is left.
      </p>
    );
  }

  if (status === 'complete') {
    return (
      <p className={`${styles.verdict} ${styles.verdictGood}`} role="status">
        Task complete. Five kills in {figure(elapsedTicks)}, with{' '}
        {figure(remainingTicks)} to spare.
      </p>
    );
  }

  if (status === 'failed') {
    return (
      <p className={`${styles.verdict} ${styles.verdictBad}`} role="status">
        {killsRemaining === 0 ? (
          <>
            Missed it. Five kills took {figure(elapsedTicks)} —{' '}
            {figure(-remainingTicks)} over the nine minutes.
          </>
        ) : (
          <>
            Out of time. {plural(killsLogged, 'kill')} have used{' '}
            {figure(elapsedTicks)} of the {figure(speedChaserBudgetTicks)}, so
            the {plural(killsRemaining, 'kill')} still to come cannot fit.
          </>
        )}
      </p>
    );
  }

  return (
    <p
      className={`${styles.verdict} ${
        status === 'at-risk' ? styles.verdictWarn : styles.verdictGood
      }`}
      role="status"
    >
      {figure(remainingTicks)} left for {plural(killsRemaining, 'kill')} — average{' '}
      {figure(requiredAverageTicks ?? 0)} each from here.{' '}
      {bankedTicks >= 0
        ? `You are ${formatTicks(bankedTicks)} up on the flat pace.`
        : `You are ${formatTicks(-bankedTicks)} down on the flat pace.`}{' '}
      {averageKillTicks !== null && projectedTicks !== null && (
        <>
          Keep averaging {figure(averageKillTicks)} and the attempt finishes on{' '}
          {figure(projectedTicks)}.
        </>
      )}
    </p>
  );
}

/**
 * The Maggot King Speed Chaser planner.
 *
 * One kill is entered at a time and committed as a split — the attempt happened
 * in an order and cannot be revised mid-flight, so a five-field form was the
 * wrong shape for it. Correcting a mistake means resetting, which is the same
 * thing the attempt itself demands.
 *
 * Every number is derived from those splits, in ticks, with no timer running:
 * the achievement counts time in combat, not wall clock, so banking special
 * attack energy between kills costs nothing.
 */
export function MaggotKingSpeedChaser() {
  const [kills, setKills] = useState<number[]>([]);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);

  const summary = useMemo(() => summariseAttempt(kills), [kills]);
  // Parsed as it is typed so the tick it will be scored as is visible before
  // it is committed, not after.
  const preview = useMemo(() => parseKillTime(draft), [draft]);

  const { requiredAverageTicks, killsLogged, killsRemaining, status } = summary;
  const hasRoomLeft = requiredAverageTicks !== null && requiredAverageTicks > 0;
  const isAcceptingKills = killsRemaining > 0 && status !== 'failed';

  function reset() {
    setKills([]);
    setDraft('');
    setError(null);
  }

  function logKill() {
    const { ticks, error: parseError } = parseKillTime(draft);

    if (ticks === null) {
      setError(parseError ?? 'Enter the kill time');

      return;
    }

    setKills((current) => [...current, ticks]);
    setDraft('');
    setError(null);
  }

  return (
    <div className={styles.page}>
      <SectionHeader
        title="Maggot King Speed Chaser"
        subtitle="Five kills, nine minutes. Log each kill as it lands and see what the rest have to average."
        icon={<StopwatchIcon width={18} height={18} />}
      />

      <div className={styles.brief}>
        <span className={styles.briefTier}>Grandmaster</span>
        <span>
          Budget{' '}
          <span className={styles.briefValue}>
            {formatTicks(speedChaserBudgetTicks)}
          </span>
        </span>
        <span>
          Kills <span className={styles.briefValue}>{speedChaserKillCount}</span>
        </span>
        <span>
          Flat pace{' '}
          <span className={styles.briefValue}>{formatTicks(flatPaceTicks)}</span>
        </span>
        <span>
          Tick <span className={styles.briefValue}>0.6s</span>
        </span>
      </div>

      <div className={styles.stats}>
        <Stat
          label="Time used"
          value={formatTicks(summary.elapsedTicks)}
          sub={`${killsLogged} of ${speedChaserKillCount} kills logged`}
        />
        <Stat
          label="Time left"
          value={formatTicks(summary.remainingTicks)}
          sub={`of ${formatTicks(speedChaserBudgetTicks)}`}
          tone={status === 'failed' ? 'bad' : 'good'}
        />
        <Stat
          label="Need per kill"
          value={hasRoomLeft ? formatTicks(requiredAverageTicks) : '—'}
          sub={
            killsRemaining === 0
              ? 'all five kills logged'
              : `over the last ${plural(killsRemaining, 'kill')}`
          }
          tone={requiredAverageTone(requiredAverageTicks)}
        />
        <Stat
          label="Banked"
          value={formatTickDelta(summary.bankedTicks)}
          sub={`against ${formatTicks(flatPaceTicks)} a kill`}
          tone={summary.bankedTicks >= 0 ? 'good' : 'bad'}
        />
      </div>

      <BudgetBar killTicks={kills} summary={summary} />

      <Verdict summary={summary} />

      {isAcceptingKills ? (
        <form
          className={styles.entry}
          onSubmit={(event) => {
            event.preventDefault();
            logKill();
          }}
        >
          <div className={styles.entryHead}>
            <span className={styles.entryStep}>
              Kill {killsLogged + 1} of {speedChaserKillCount}
            </span>
            {hasRoomLeft && (
              <span className={styles.entryTarget}>
                needs {formatTicks(requiredAverageTicks)} or better
              </span>
            )}
          </div>
          <div className={styles.entryRow}>
            <input
              className={`${styles.entryInput} ${
                error ? styles.entryInputInvalid : ''
              }`}
              type="text"
              autoComplete="off"
              spellCheck={false}
              autoFocus
              placeholder="1:42.60"
              aria-label="Kill time"
              aria-invalid={error !== null}
              value={draft}
              onChange={({ target }) => {
                setDraft(target.value);
                setError(null);
              }}
            />
            <button type="submit" className={styles.entrySubmit}>
              Log kill
            </button>
          </div>
          <p className={styles.entryHint} aria-live="polite">
            <EntryHint error={error} previewTicks={preview.ticks} />
          </p>
        </form>
      ) : (
        <div className={styles.entry}>
          <div className={styles.entryHead}>
            <span className={styles.entryStep}>
              {killsRemaining === 0 ? 'Attempt finished' : 'Attempt over'}
            </span>
          </div>
          {/* No instruction to "press reset" — the button is immediately
              below, in the splits header it actually acts on. */}
          <p className={styles.entryHint}>
            {killsRemaining === 0
              ? 'All five kills are in.'
              : 'There is no time left for the kills still to come.'}
          </p>
        </div>
      )}

      <section className={styles.splits}>
        <div className={styles.splitsHead}>
          <h3 className={styles.splitsTitle}>Splits</h3>
          <button
            type="button"
            className={styles.reset}
            disabled={killsLogged === 0}
            onClick={reset}
          >
            Reset attempt
          </button>
        </div>
        <ol className={styles.splitList}>
          {killSlots.map((slot) => {
            const ticks = kills[slot];

            if (ticks === undefined) {
              return (
                <li key={slot} className={`${styles.split} ${styles.splitGhost}`}>
                  <span className={styles.splitIndex}>{slot + 1}</span>
                  <span className={styles.splitTime}>--:--.-</span>
                </li>
              );
            }

            const paceDelta = flatPaceTicks - ticks;

            return (
              <li key={slot} className={styles.split}>
                <span className={styles.splitIndex}>{slot + 1}</span>
                <span className={styles.splitTime}>{formatTicks(ticks)}</span>
                <span
                  className={
                    paceDelta < 0 ? styles.splitBehind : styles.splitAhead
                  }
                >
                  {formatTickDelta(paceDelta)}
                </span>
              </li>
            );
          })}
        </ol>
      </section>

      <p className={styles.footnote}>
        The achievement counts only time spent fighting the boss, so waiting on
        special attack energy or a surge potion cooldown between kills is free —
        log each fight duration on its own. Times are held in game ticks (0.6s),
        which is why anything typed in between snaps to the nearest one. A
        dead-on {formatTicks(speedChaserBudgetTicks)} counts as inside the limit.
        Task detail on the{' '}
        <a
          href="https://oldschool.runescape.wiki/w/Maggot_King_Speed_Chaser"
          target="_blank"
          rel="noreferrer"
        >
          OSRS Wiki
        </a>
        .
      </p>
    </div>
  );
}
