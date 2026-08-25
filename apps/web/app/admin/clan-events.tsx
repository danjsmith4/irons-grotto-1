'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAction } from 'next-safe-action/hooks';
import { toast } from 'react-toastify';
import { Spinner } from '@radix-ui/themes';
import {
  ExclamationTriangleIcon,
  LockClosedIcon,
  PersonIcon,
} from '@radix-ui/react-icons';
import { PlayerNameButton } from '@/app/components/player-name-button';
import { ItemImageWithFallback } from '@/app/components/item-image-with-fallback';
import { clientConstants } from '@/config/constants.client';
import {
  clanEventMetrics,
  defaultClanEventName,
  findClanEventMetric,
} from '@/config/clan-events';
import type { ClanEventsAdminData } from '@/app/data-sources/fetch-clan-events';
import { createClanEventAction } from './actions/create-clan-event-action';
import { importClanEventAction } from './actions/import-clan-event-action';
import styles from './admin.module.css';

interface ClanEventsProps {
  data: ClanEventsAdminData | null;
  /** Why the pane could not load, if it could not. */
  error: string | null;
}

const utcDateTime = new Intl.DateTimeFormat('en-GB', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'UTC',
  hour12: false,
});

function formatUtc(iso: string) {
  return `${utcDateTime.format(new Date(iso))} UTC`;
}

function competitionUrl(id: number) {
  return `${clientConstants.temple.baseUrl}/competitions/standings.php?id=${id}`;
}

/**
 * Skill of the Week / Boss of the Week administration.
 *
 * The whole point of this pane is that creating an event is one decision, not
 * six: staff pick the skill or the boss, and the type, the dates, the linked
 * group and the participant sync are all decided by the rules. The fields that
 * are not theirs to choose are still *shown* — locked, with the reason — so
 * nobody has to guess what the site is about to book on their behalf.
 */
export function ClanEvents({ data, error }: ClanEventsProps) {
  const router = useRouter();
  const [metricId, setMetricId] = useState<number | null>(null);
  const [name, setName] = useState('');
  const [importId, setImportId] = useState('');
  const [importKey, setImportKey] = useState('');

  const nextSlot = data?.nextSlot ?? null;
  const metrics = nextSlot ? clanEventMetrics[nextSlot.type] : [];
  const metric =
    nextSlot && metricId !== null
      ? findClanEventMetric(nextSlot.type, metricId)
      : null;

  // The name follows the chosen metric until somebody types over it.
  const resolvedName = useMemo(() => {
    if (name.trim()) {
      return name.trim();
    }

    return nextSlot && metric
      ? defaultClanEventName(nextSlot.type, metric.name)
      : '';
  }, [name, nextSlot, metric]);

  const { execute: create, isExecuting: isCreating } = useAction(
    createClanEventAction,
    {
      onSuccess({ data: result }) {
        if (!result) {
          return;
        }

        toast.success(
          result.alreadyRecorded
            ? `“${result.name}” was already on TempleOSRS — recorded here.`
            : `“${result.name}” created on TempleOSRS.`,
        );

        if (!result.hasCompetitionKey) {
          toast.warn(
            'TempleOSRS did not return an edit key for that competition, so it cannot be edited from here later.',
          );
        }

        setMetricId(null);
        setName('');
        router.refresh();
      },
      onError({ error: actionError }) {
        toast.error(actionError.serverError ?? 'Could not create that event.');
      },
    },
  );

  const { execute: importEvent, isExecuting: isImporting } = useAction(
    importClanEventAction,
    {
      onSuccess({ data: result }) {
        toast.success(`“${result?.name ?? 'Competition'}” imported.`);
        setImportId('');
        setImportKey('');
        router.refresh();
      },
      onError({ error: actionError }) {
        toast.error(
          actionError.serverError ?? 'Could not import that competition.',
        );
      },
    },
  );

  if (error || !data || !nextSlot) {
    return (
      <div className={styles.panel}>
        <p className={styles.errorNote}>
          <ExclamationTriangleIcon />
          {error ?? 'Events could not be loaded.'}
        </p>
      </div>
    );
  }

  const isBlocked = !!nextSlot.blockedReason;
  const { picker } = data;
  const metricNoun = nextSlot.type === 'sotw' ? 'skill' : 'boss';

  return (
    <>
      <div className={styles.panel}>
        <div className={styles.panelHead}>
          <h2 className={styles.panelTitle}>
            Create the next {nextSlot.typeLabel}
          </h2>
          <span className={styles.panelMeta}>
            {nextSlot.type.toUpperCase()}
          </span>
        </div>

        {/*
          Who picks: the last winner of *this same kind* of event. Not last
          week's winner — the two types alternate, so whoever is winning right
          now is playing the other one and picks the other one.

          When that winner has left the clan the site does not quietly skip to
          the next name: it says who the rule points at, that they are gone,
          and who to ask instead. Silently substituting would leave a moderator
          unable to tell a stand-in from the real answer.
        */}
        <p className={styles.pickerNote}>
          <PersonIcon />
          {picker.winner ? (
            <span>
              {picker.winner.isActiveMember ? (
                <>
                  Ask{' '}
                  <PlayerNameButton
                    name={picker.winner.playerName}
                    className={styles.pickerName}
                  />{' '}
                  for the {metricNoun} — they won the last {nextSlot.typeLabel},
                  “{picker.winner.eventName}”.
                </>
              ) : (
                <>
                  <PlayerNameButton
                    name={picker.winner.playerName}
                    className={styles.pickerName}
                  />{' '}
                  won the last {nextSlot.typeLabel} (“{picker.winner.eventName}
                  ”) but has{' '}
                  <strong className={styles.departed}>
                    left the clan
                  </strong>.{' '}
                  {picker.standIn ? (
                    <>
                      Ask{' '}
                      <PlayerNameButton
                        name={picker.standIn.playerName}
                        className={styles.pickerName}
                      />{' '}
                      instead — they won “{picker.standIn.eventName}”.
                    </>
                  ) : (
                    <>
                      No earlier {nextSlot.typeLabel} winner is still here, so
                      choose the {metricNoun} with the rest of staff.
                    </>
                  )}
                </>
              )}
            </span>
          ) : (
            <span>
              No previous {nextSlot.typeLabel} has a winner recorded, so there
              is nobody to ask — choose the {metricNoun} with the rest of staff.
            </span>
          )}
        </p>

        <div className={styles.eventForm}>
          <label className={styles.field}>
            <span className={styles.fieldLabel}>
              {nextSlot.type === 'sotw' ? 'Skill' : 'Boss'}
            </span>
            <div className={styles.metricPicker}>
              {metric && (
                <ItemImageWithFallback itemName={metric.icon} size={24} />
              )}
              <select
                className={styles.select}
                value={metricId ?? ''}
                disabled={isBlocked || isCreating}
                onChange={(event) =>
                  setMetricId(
                    event.target.value ? Number(event.target.value) : null,
                  )
                }
              >
                <option value="">
                  Choose a {nextSlot.type === 'sotw' ? 'skill' : 'boss'}…
                </option>
                {metrics.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.name}
                  </option>
                ))}
              </select>
            </div>
            <span className={styles.fieldHint}>
              The only thing here that is yours to decide.
            </span>
          </label>

          {/*
            Locked, but shown. These are not inputs the site is withholding —
            they are decisions it has already made, and staff should be able to
            see what is about to be booked without opening Temple.
          */}
          <div className={styles.field}>
            <span className={styles.fieldLabel}>Event type</span>
            <div className={styles.lockedValue}>
              <LockClosedIcon />
              {nextSlot.typeLabel}
            </div>
            <span className={styles.fieldHint}>
              SOTW and BOTW alternate. This follows the last event recorded.
            </span>
          </div>

          <div className={styles.field}>
            <span className={styles.fieldLabel}>Starts</span>
            <div className={styles.lockedValue}>
              <LockClosedIcon />
              {formatUtc(nextSlot.startsAt)}
            </div>
            <span className={styles.fieldHint}>
              Every event opens Friday 14:00 UTC.
            </span>
          </div>

          <div className={styles.field}>
            <span className={styles.fieldLabel}>Ends</span>
            <div className={styles.lockedValue}>
              <LockClosedIcon />
              {formatUtc(nextSlot.endsAt)}
            </div>
            <span className={styles.fieldHint}>
              And closes Friday 10:00 UTC.
            </span>
          </div>

          <div className={styles.field}>
            <span className={styles.fieldLabel}>Participants</span>
            <div className={styles.lockedValue}>
              <LockClosedIcon />
              Synced to the clan group
            </div>
            <span className={styles.fieldHint}>
              Temple keeps the entrant list in step with the group — nobody has
              to be added by hand.
            </span>
          </div>

          <label className={`${styles.field} ${styles.fieldWide}`}>
            <span className={styles.fieldLabel}>Competition name</span>
            <input
              className={styles.textInput}
              value={name}
              disabled={isBlocked || isCreating}
              placeholder={
                metric
                  ? defaultClanEventName(nextSlot.type, metric.name)
                  : `<${nextSlot.type === 'sotw' ? 'Skill' : 'Boss'}> ${nextSlot.nameSuffix}`
              }
              onChange={(event) => setName(event.target.value)}
            />
            <span className={styles.fieldHint}>
              Leave it alone unless there is a reason — the default is what
              members will recognise.
            </span>
          </label>
        </div>

        {isBlocked && (
          <p className={styles.errorNote}>
            <ExclamationTriangleIcon />
            {nextSlot.blockedReason}
          </p>
        )}

        <div className={styles.panelActions}>
          <button
            type="button"
            className={styles.primaryButton}
            disabled={isBlocked || isCreating || metricId === null}
            onClick={() => {
              if (metricId === null) {
                return;
              }

              create({
                metricId,
                expectedType: nextSlot.type,
                name: resolvedName || undefined,
              });
            }}
          >
            {isCreating && <Spinner size="1" />}
            Create on TempleOSRS
          </button>
        </div>
      </div>

      <div className={styles.panel}>
        <div className={styles.panelHead}>
          <h2 className={styles.panelTitle}>Events</h2>
          <span className={styles.panelMeta}>
            {data.events.length} recorded
          </span>
        </div>

        {data.events.length === 0 ? (
          <p className={styles.empty}>
            Nothing recorded yet. Import the competition that is running now so
            the site knows which type comes next.
          </p>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th className={styles.thLeft}>Event</th>
                  <th className={styles.thLeft}>Runs</th>
                  <th className={styles.thLeft}>Winner</th>
                  <th>Standings</th>
                </tr>
              </thead>
              <tbody>
                {data.events.map((event) => (
                  <tr key={event.id}>
                    <td>
                      <div className={styles.nameCell}>
                        {event.icon && (
                          <ItemImageWithFallback
                            itemName={event.icon}
                            size={20}
                          />
                        )}
                        <span className={styles.name}>{event.name}</span>
                        {!event.hasCompetitionKey && (
                          <span
                            className={styles.noAction}
                            title="No edit key stored — this competition cannot be changed from here."
                          >
                            no key
                          </span>
                        )}
                      </div>
                    </td>
                    <td className={styles.rankCell}>
                      {formatUtc(event.startsAt)} → {formatUtc(event.endsAt)}
                    </td>
                    <td className={styles.roleCell}>
                      {event.winner ? (
                        <span className={styles.nameCell}>
                          <PlayerNameButton
                            name={event.winner.playerName}
                            className={styles.name}
                          />
                          {!event.winner.isActiveMember && (
                            <span
                              className={styles.departedTag}
                              title="No longer in the clan"
                            >
                              left
                            </span>
                          )}
                        </span>
                      ) : (
                        <span className={styles.noAction}>—</span>
                      )}
                    </td>
                    <td className={styles.actionCell}>
                      <a
                        className={styles.ghostButton}
                        href={competitionUrl(event.id)}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Temple
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {data.winCounts.length > 0 && (
        <div className={styles.panel}>
          <div className={styles.panelHead}>
            <h2 className={styles.panelTitle}>Most event wins</h2>
          </div>
          <ul className={styles.history}>
            {data.winCounts.map((entry) => (
              <li key={entry.playerName} className={styles.historyRow}>
                <span className={styles.historyIcon}>
                  <PersonIcon />
                </span>
                <div className={styles.historyText}>
                  <span className={styles.historyLine}>
                    <PlayerNameButton
                      name={entry.playerName}
                      className={styles.name}
                    />
                    {/* Kept, not filtered — the tally is a record of who won
                        what, and dropping someone the day they leave would
                        rewrite it. */}
                    {!entry.isActiveMember && (
                      <span
                        className={styles.departedTag}
                        title="No longer in the clan"
                      >
                        left
                      </span>
                    )}
                  </span>
                </div>
                <span className={styles.historyTime}>
                  {entry.wins} {entry.wins === 1 ? 'win' : 'wins'}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/*
        Bootstrapping, and the occasional back-fill. The alternation reads the
        last recorded event, so a competition created on Temple directly has to
        be brought in or the next type would be a guess.
      */}
      <div className={styles.panel}>
        <div className={styles.panelHead}>
          <h2 className={styles.panelTitle}>Import an existing competition</h2>
          <span className={styles.panelMeta}>TempleOSRS</span>
        </div>

        <div className={styles.eventForm}>
          <label className={styles.field}>
            <span className={styles.fieldLabel}>Competition ID</span>
            <input
              className={styles.textInput}
              value={importId}
              inputMode="numeric"
              placeholder="38852"
              disabled={isImporting}
              onChange={(event) =>
                setImportId(event.target.value.replace(/\D/g, ''))
              }
            />
            <span className={styles.fieldHint}>
              The <code>id=</code> in the competition&apos;s Temple URL. Its
              name, dates and type are read from Temple.
            </span>
          </label>

          <label className={styles.field}>
            <span className={styles.fieldLabel}>Edit key (optional)</span>
            <input
              className={styles.textInput}
              value={importKey}
              disabled={isImporting}
              placeholder="Only if you still have it"
              onChange={(event) => setImportKey(event.target.value)}
            />
            <span className={styles.fieldHint}>
              Temple shows this once, when a competition is made. Without it the
              event is still tracked, it just cannot be edited from here.
            </span>
          </label>
        </div>

        <div className={styles.panelActions}>
          <button
            type="button"
            className={styles.ghostButton}
            disabled={isImporting || !importId}
            onClick={() =>
              importEvent({
                competitionId: Number(importId),
                competitionKey: importKey.trim() || undefined,
              })
            }
          >
            {isImporting && <Spinner size="1" />}
            Import
          </button>
        </div>
      </div>
    </>
  );
}
