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

const emptyAttempt = Array.from<string>({ length: speedChaserKillCount }).fill(
  '',
);

/** The flat-pace gridlines on the budget bar: every 1:48.0 short of the end. */
const paceGridlines = Array.from(
  { length: speedChaserKillCount - 1 },
  (_, index) => (index + 1) * flatPaceTicks,
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
  killTicks: (number | null)[];
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
            if (ticks === null) {
              return null;
            }

            consumed += ticks;

            const isOver = consumed > speedChaserBudgetTicks;
            const isAlternate = index % 2 === 1;

            return (
              <span
                // Fixed-length list of kill slots — the index is the identity.
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
        {figure(flatPaceTicks)} each — enter a kill time as it lands and this
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
            the {plural(killsRemaining, 'kill')} still to come cannot fit. Reset
            and go again.
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
 * The player types each fight duration off the chat message as it lands; every
 * number on the page is derived from those, in ticks, with no timer running.
 * That matters because the achievement counts time in combat, not wall clock —
 * banking special attack energy between kills costs nothing.
 */
export function MaggotKingSpeedChaser() {
  const [entries, setEntries] = useState<string[]>(emptyAttempt);

  const parsed = useMemo(() => entries.map(parseKillTime), [entries]);
  const killTicks = useMemo(() => parsed.map(({ ticks }) => ticks), [parsed]);
  const summary = useMemo(() => summariseAttempt(killTicks), [killTicks]);

  const isStarted = entries.some((entry) => entry.trim() !== '');
  const { requiredAverageTicks, killsRemaining, status } = summary;
  const hasRoomLeft = requiredAverageTicks !== null && requiredAverageTicks > 0;

  return (
    <div className={styles.page}>
      <SectionHeader
        title="Maggot King Speed Chaser"
        subtitle="Five kills, nine minutes. Log each kill and see what the rest have to average."
        icon={<StopwatchIcon width={18} height={18} />}
        actions={
          <button
            type="button"
            className={styles.reset}
            disabled={!isStarted}
            onClick={() => {
              setEntries(emptyAttempt);
            }}
          >
            Reset attempt
          </button>
        }
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
          sub={`${summary.killsLogged} of ${speedChaserKillCount} kills logged`}
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

      <BudgetBar killTicks={killTicks} summary={summary} />

      <Verdict summary={summary} />

      <section className={styles.kills}>
        <div className={styles.killsHead}>
          <h3 className={styles.killsTitle}>Kill times</h3>
          <span className={styles.killsHint}>
            As the game writes them: 1:42.60, 1:42.6 or 102.6
          </span>
        </div>
        <ol className={styles.killList}>
          {entries.map((entry, index) => {
            const { ticks, error } = parsed[index];
            const paceDelta = ticks === null ? null : flatPaceTicks - ticks;

            return (
              <li
                // Five fixed kill slots — the index is the identity, and rows
                // are never added, removed or reordered.
                key={index}
                className={styles.killRow}
              >
                <span className={styles.killIndex}>Kill {index + 1}</span>
                <input
                  className={`${styles.killInput} ${
                    error ? styles.killInputInvalid : ''
                  }`}
                  type="text"
                  autoComplete="off"
                  spellCheck={false}
                  placeholder={formatTicks(flatPaceTicks)}
                  aria-label={`Kill ${index + 1} time`}
                  aria-invalid={error !== null}
                  value={entry}
                  onChange={({ target }) => {
                    setEntries((current) =>
                      current.map((value, position) =>
                        position === index ? target.value : value,
                      ),
                    );
                  }}
                />
                <span className={styles.killReadout}>
                  {error !== null && (
                    <span className={styles.killError}>{error}</span>
                  )}
                  {ticks !== null && (
                    <>
                      {/* Echoed back snapped to the tick it was rounded to, so
                          a time the game could not produce is visibly fixed. */}
                      <span className={styles.killTicks}>
                        {formatTicks(ticks)}
                      </span>
                      <span>{plural(ticks, 'tick')}</span>
                      <span
                        className={
                          paceDelta !== null && paceDelta < 0
                            ? styles.killError
                            : styles.toneGood
                        }
                      >
                        {formatTickDelta(paceDelta ?? 0)} on pace
                      </span>
                    </>
                  )}
                  {ticks === null && error === null && hasRoomLeft && (
                    <span>≤ {formatTicks(requiredAverageTicks)} to stay in</span>
                  )}
                </span>
              </li>
            );
          })}
        </ol>
      </section>

      <p className={styles.footnote}>
        The achievement counts only time spent fighting the boss, so waiting on
        special attack energy or a surge potion cooldown between kills is free —
        enter each fight duration on its own. Times are held in game ticks
        (0.6s), which is why anything typed in between snaps to the nearest one.
        A dead-on {formatTicks(speedChaserBudgetTicks)} counts as inside the
        limit. Task detail on the{' '}
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
