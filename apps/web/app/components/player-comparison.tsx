'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { getRankImageUrl } from '@/app/rank-calculator/utils/get-rank-image-url';
import { getRankName } from '@/app/rank-calculator/utils/get-rank-name';
import { Rank } from '@/config/enums';
import type { ViewerAccount } from '@/app/data-sources/fetch-viewer-accounts';
import { splitRowsByDirection } from '@/app/utils/build-points-comparison';
import type {
  ComparisonRow,
  PointsComparison,
} from '@/app/utils/build-points-comparison';
import styles from './player-comparison.module.css';

interface PlayerComparisonProps {
  subjectName: string;
  accounts: ViewerAccount[];
}

/** How many ledger rows a list shows before the rest are folded away. */
const visibleRowCount = 12;

/**
 * The ledger is scored from what is stored, and the headline from what the
 * leaderboard holds; a few points of daylight between them is the ordinary
 * case and saying so every time would be noise. These two thresholds have to
 * both be crossed before it is worth a sentence — a shortfall that is neither
 * large nor a meaningful share of the total explains nothing.
 */
const unaccountedNoticePoints = 50;
const unaccountedNoticeShare = 0.01;

const storageKey = 'irons-grotto:comparison-account';

function readStoredAccount() {
  try {
    return window.localStorage.getItem(storageKey);
  } catch {
    return null;
  }
}

function writeStoredAccount(playerName: string) {
  try {
    window.localStorage.setItem(storageKey, playerName);
  } catch {
    // A picker that forgets is a small loss; a crash is not.
  }
}

function signed(value: number) {
  if (value === 0) {
    return '0';
  }

  return `${value > 0 ? '+' : '−'}${Math.abs(value).toLocaleString()}`;
}

/**
 * The points diff between the member whose profile is open and one of the
 * viewer's own accounts, ordered by how much each line is doing to the gap.
 *
 * Every row is signed the same way — positive means the profile's owner is
 * ahead — so the bars all read against one axis and the eye can run down the
 * list without re-reading which way round each one is.
 */
export function PlayerComparison({
  subjectName,
  accounts,
}: PlayerComparisonProps) {
  const selectable = useMemo(
    () =>
      accounts.filter(
        ({ playerName }) =>
          playerName.toLowerCase() !== subjectName.toLowerCase(),
      ),
    [accounts, subjectName],
  );

  const [selected, setSelected] = useState<string | null>(null);
  const [comparison, setComparison] = useState<PointsComparison | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedLeading, setExpandedLeading] = useState(false);
  const [showTrailing, setShowTrailing] = useState(false);
  const [expandedTrailing, setExpandedTrailing] = useState(false);

  // Pick up where the member left off, but never on an account that is not in
  // the list any more (renamed, removed, or the one being looked at).
  useEffect(() => {
    setSelected((current) => {
      if (current && selectable.some((a) => a.playerName === current)) {
        return current;
      }

      const stored = readStoredAccount();

      return (
        selectable.find((a) => a.playerName === stored)?.playerName ??
        selectable[0]?.playerName ??
        null
      );
    });
  }, [selectable]);

  useEffect(() => {
    if (!selected) return undefined;

    const controller = new AbortController();

    setComparison(null);
    setError(null);
    setExpandedLeading(false);
    setShowTrailing(false);
    setExpandedTrailing(false);
    setLoading(true);

    fetch(
      `/api/player-comparison?subject=${encodeURIComponent(
        subjectName,
      )}&viewer=${encodeURIComponent(selected)}`,
      { signal: controller.signal },
    )
      .then((response) => response.json())
      .then(
        (result: {
          success: boolean;
          data?: PointsComparison;
          error?: string;
        }) => {
          if (result.success && result.data) setComparison(result.data);
          else setError(result.error ?? 'Failed to build the comparison');
        },
      )
      .catch((thrown: unknown) => {
        if ((thrown as Error)?.name !== 'AbortError') {
          setError(String(thrown));
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [subjectName, selected]);

  if (selectable.length === 0) {
    return (
      <div className={styles.empty}>
        You have no other account to compare against.
      </div>
    );
  }

  const { subjectLeads, leading, trailing, trailingTotal } = comparison
    ? splitRowsByDirection(comparison)
    : { subjectLeads: true, leading: [], trailing: [], trailingTotal: 0 };

  const trailingLeader = subjectLeads
    ? 'You'
    : (comparison?.subject.playerName ?? '');

  return (
    <div className={styles.root}>
      {selectable.length > 1 && (
        <div className={styles.picker}>
          <span className={styles.pickerLabel}>Compare with</span>
          <div className={styles.chips}>
            {selectable.map((account) => (
              <button
                key={account.playerName}
                type="button"
                className={`${styles.chip} ${
                  account.playerName === selected ? styles.chipActive : ''
                }`}
                aria-pressed={account.playerName === selected}
                onClick={() => {
                  setSelected(account.playerName);
                  writeStoredAccount(account.playerName);
                }}
              >
                <Image
                  src={getRankImageUrl(account.rank as Rank)}
                  alt=""
                  width={16}
                  height={16}
                  style={{ borderRadius: '50%' }}
                />
                {account.playerName}
              </button>
            ))}
          </div>
        </div>
      )}

      {loading && <div className={styles.loading}>Scoring both accounts…</div>}
      {error && <div className={styles.error}>{error}</div>}

      {comparison && (
        <>
          <Scoreboard comparison={comparison} />

          <section className={styles.section}>
            <header className={styles.sectionHead}>
              <h4 className={styles.sectionTitle}>Where the gap sits</h4>
              <Legend comparison={comparison} />
            </header>
            <div className={styles.ledger}>
              {comparison.categories.map((row) => (
                <LedgerRow
                  key={row.key}
                  row={row}
                  scale={Math.max(
                    ...comparison.categories.map((c) => Math.abs(c.delta)),
                    1,
                  )}
                  emphasis
                />
              ))}
            </div>
          </section>

          <section className={styles.section}>
            <header className={styles.sectionHead}>
              <h4 className={styles.sectionTitle}>What is driving it</h4>
              <span className={styles.sectionMeta}>
                {comparison.rows.length.toLocaleString()} differences
              </span>
            </header>

            {leading.length === 0 ? (
              <div className={styles.empty}>
                {comparison.rows.length === 0
                  ? 'These two accounts score identically, line for line.'
                  : `Every itemised difference favours ${
                      trailingLeader === 'You' ? 'you' : trailingLeader
                    }.`}
              </div>
            ) : (
              <LedgerList
                rows={leading}
                scale={comparison.largestDelta}
                expanded={expandedLeading}
                onExpand={() => setExpandedLeading(true)}
              />
            )}

            {trailing.length > 0 && (
              <>
                {/*
                 * The other direction is folded away rather than dropped, and
                 * its total sits in the label — so the ledger still reconciles
                 * to the headline at a glance even while collapsed. On a
                 * lopsided comparison this reads as a rounding error and gets
                 * ignored; on a close one it is most of the story, and says so.
                 */}
                <button
                  type="button"
                  className={`${styles.moreButton} ${styles.counterButton}`}
                  aria-expanded={showTrailing}
                  onClick={() => setShowTrailing((shown) => !shown)}
                >
                  {trailingLeader}{' '}
                  {trailingLeader === 'You' ? 'also lead' : 'also leads'}{' '}
                  {trailing.length.toLocaleString()} line
                  {trailing.length === 1 ? '' : 's'}{' '}
                  {/*
                   * Magnitude, not a signed delta. Every row is signed from
                   * the subject, so this total is negative whenever the viewer
                   * is the one leading — and "You also lead (−3,120)" reads as
                   * a contradiction. The direction is already in the sentence.
                   */}
                  <span
                    className={`${styles.counterTotal} ${
                      subjectLeads ? styles.deltaViewer : styles.deltaSubject
                    }`}
                  >
                    {trailingTotal.toLocaleString()} points
                  </span>
                </button>

                {showTrailing && (
                  <LedgerList
                    rows={trailing}
                    scale={comparison.largestDelta}
                    expanded={expandedTrailing}
                    onExpand={() => setExpandedTrailing(true)}
                  />
                )}
              </>
            )}
          </section>

          <Footnotes comparison={comparison} />
        </>
      )}
    </div>
  );
}

/**
 * One direction's rows, with its own long tail folded away. Both lists scale
 * their bars against the same number, so a row stays the same length whichever
 * list it turns up in.
 */
function LedgerList({
  rows,
  scale,
  expanded,
  onExpand,
}: {
  rows: ComparisonRow[];
  scale: number;
  expanded: boolean;
  onExpand: () => void;
}) {
  const visible = expanded ? rows : rows.slice(0, visibleRowCount);
  const hidden = rows.length - visible.length;

  return (
    <>
      <div className={styles.ledger}>
        {visible.map((row) => (
          <LedgerRow key={row.key} row={row} scale={Math.max(scale, 1)} />
        ))}
      </div>

      {hidden > 0 && (
        <button
          type="button"
          className={styles.moreButton}
          onClick={onExpand}
        >
          Show {hidden.toLocaleString()} smaller difference
          {hidden === 1 ? '' : 's'}
        </button>
      )}
    </>
  );
}

function Scoreboard({ comparison }: { comparison: PointsComparison }) {
  const { subject, viewer, totalDelta } = comparison;
  const total = subject.storedPoints + viewer.storedPoints;
  const subjectShare = total > 0 ? (subject.storedPoints / total) * 100 : 50;

  return (
    <div className={styles.scoreboard}>
      <div className={styles.side}>
        <span className={styles.sideName}>{subject.playerName}</span>
        <span className={`${styles.sideValue} ${styles.subjectValue}`}>
          {subject.storedPoints.toLocaleString()}
        </span>
        <span className={styles.sideRank}>
          {getRankName(subject.rank as Rank)}
        </span>
      </div>

      <div className={styles.gap}>
        <span className={styles.gapValue}>{signed(totalDelta)}</span>
        <span className={styles.gapLabel}>
          {totalDelta === 0
            ? 'dead level'
            : `${totalDelta > 0 ? subject.playerName : viewer.playerName} ahead`}
        </span>
        <div className={styles.shareTrack}>
          <div
            className={styles.shareFill}
            style={{ width: `${subjectShare}%` }}
          />
        </div>
      </div>

      <div className={`${styles.side} ${styles.sideRight}`}>
        <span className={styles.sideName}>{viewer.playerName}</span>
        <span className={`${styles.sideValue} ${styles.viewerValue}`}>
          {viewer.storedPoints.toLocaleString()}
        </span>
        <span className={styles.sideRank}>
          {getRankName(viewer.rank as Rank)}
        </span>
      </div>
    </div>
  );
}

function Legend({ comparison }: { comparison: PointsComparison }) {
  return (
    <span className={styles.legend}>
      <span className={styles.legendItem}>
        <i className={`${styles.swatch} ${styles.swatchSubject}`} />
        {comparison.subject.playerName}
      </span>
      <span className={styles.legendItem}>
        <i className={`${styles.swatch} ${styles.swatchViewer}`} />
        {comparison.viewer.playerName}
      </span>
    </span>
  );
}

function LedgerRow({
  row,
  scale,
  emphasis = false,
}: {
  row: ComparisonRow;
  scale: number;
  emphasis?: boolean;
}) {
  const leadsSubject = row.delta > 0;
  // The track is centred, so each half is 50% of it — a row at full scale
  // reaches the edge and no further.
  const width = `${Math.min(50, (Math.abs(row.delta) / scale) * 50)}%`;

  return (
    <div className={`${styles.row} ${emphasis ? styles.rowEmphasis : ''}`}>
      <div className={styles.rowLabel}>
        {row.image && (
          <Image
            className={styles.rowIcon}
            src={row.image}
            alt=""
            width={22}
            height={22}
            unoptimized
          />
        )}
        <span className={styles.rowText}>
          <span className={styles.rowName}>{row.label}</span>
          <span className={styles.rowDetail}>
            {row.subject.detail && row.viewer.detail
              ? `${row.subject.detail} vs ${row.viewer.detail}`
              : (row.subject.detail ?? row.viewer.detail ?? '')}
          </span>
        </span>
      </div>

      <div className={styles.rowValues}>
        <span className={styles.rowSubjectPoints}>
          {row.subject.points.toLocaleString()}
        </span>
        <div className={styles.barTrack}>
          <span className={styles.barAxis} />
          <span
            className={`${styles.barFill} ${
              leadsSubject ? styles.barSubject : styles.barViewer
            }`}
            style={
              leadsSubject ? { width, right: '50%' } : { width, left: '50%' }
            }
          />
        </div>
        <span className={styles.rowViewerPoints}>
          {row.viewer.points.toLocaleString()}
        </span>
      </div>

      <span
        className={`${styles.rowDelta} ${
          leadsSubject ? styles.deltaSubject : styles.deltaViewer
        }`}
      >
        {signed(row.delta)}
      </span>
    </div>
  );
}

function Footnotes({ comparison }: { comparison: PointsComparison }) {
  const unaccounted = [comparison.subject, comparison.viewer].filter((side) => {
    const shortfall = Math.abs(side.storedPoints - side.breakdownPoints);

    return (
      shortfall >= unaccountedNoticePoints &&
      shortfall >= side.storedPoints * unaccountedNoticeShare
    );
  });

  if (unaccounted.length === 0) {
    return null;
  }

  return (
    <p className={styles.footnote}>
      {unaccounted
        .map(
          (side) =>
            `${Math.abs(side.storedPoints - side.breakdownPoints).toLocaleString()} of ${side.playerName}'s points`,
        )
        .join(' and ')}{' '}
      {unaccounted.length === 1 ? 'is' : 'are'} not itemised above — quest and
      combat-achievement unlocks are read live by the calculator rather than
      stored, so they sit outside this ledger.
    </p>
  );
}
