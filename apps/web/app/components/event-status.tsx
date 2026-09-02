'use client';

import { useEffect, useState } from 'react';
import { Dialog, VisuallyHidden } from '@radix-ui/themes';
import { clanEventGainLabel } from '@/config/clan-events';
import { clientConstants } from '@/config/constants.client';
import type {
  ActiveClanEvent,
  ClanEventStatus,
} from '@/app/data-sources/fetch-clan-event-status';
import type { SessionEvents } from '@/app/data-sources/fetch-session-context';
import { formatEventWhen } from '@/app/utils/format-event-when';
import { ItemImageWithFallback } from './item-image-with-fallback';
import { PlayerNameButton } from './player-name-button';
import styles from './event-status.module.css';

/**
 * The nav bar's live-event indicator, and the standings modal behind it.
 *
 * Deliberately louder than the rest of the nav: a competition is running for a
 * week and then it is gone, so this is the one thing in the bar with a pulse
 * on it. Everything else there is permanent and stays quiet. When nothing is
 * running and nothing is queued the component renders nothing at all rather
 * than an empty state — a nav item that says "no event" is just noise.
 */
interface EventStatusProps {
  /**
   * Which event is running and which is queued, from our own database.
   *
   * ⚠️ **This is what draws the indicator, and it must not depend on
   * TempleOSRS.** Whether there is an event is a fact we own; only the
   * standings belong to Temple. Waiting on Temple to decide whether to render
   * a nav item meant the loudest thing in the bar popped in a beat after the
   * page had settled — and made every page render depend on a third party
   * being up.
   */
  events: SessionEvents;
}

export function EventStatus({ events }: EventStatusProps) {
  const { active, next } = events;
  const [standings, setStandings] = useState<ActiveClanEvent | null>(null);
  const [hasTried, setHasTried] = useState(false);
  const [open, setOpen] = useState(false);

  /*
   * The standings, fetched after the indicator is already on screen.
   *
   * Deliberately not awaited by anything: the trigger is rendered from data the
   * server already had, so this only ever fills in the modal's body. Started on
   * mount rather than on open so that opening it is usually instant, and
   * skipped entirely when nothing is running, since a queued event has no
   * standings to have.
   */
  useEffect(() => {
    if (!active) {
      return undefined;
    }

    const controller = new AbortController();

    fetch('/api/clan-events/status', { signal: controller.signal })
      .then((response) => response.json())
      .then((result: { success: boolean; data?: ClanEventStatus }) => {
        if (result.success && result.data?.active) {
          setStandings(result.data.active);
        }

        setHasTried(true);
      })
      // Unknown standings are a line of copy in the modal, never a missing
      // indicator: the event is ours and is worth showing regardless.
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          console.error('Could not load clan event standings:', error);
          setHasTried(true);
        }
      });

    return () => controller.abort();
  }, [active]);

  const headline = active ?? next;

  if (!headline) {
    return null;
  }

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger>
        <button
          type="button"
          className={`${styles.trigger} ${active ? styles.triggerLive : ''}`}
          aria-label={
            active
              ? `${active.name} is running — open event standings`
              : `${headline.name} starts ${formatEventWhen(headline.startsAt)} — open event details`
          }
        >
          <span className={styles.pulse} aria-hidden />
          <span className={styles.triggerLabel}>
            {active ? active.metricName : 'Next event'}
          </span>
          <span className={styles.triggerMeta}>
            {active
              ? active.type.toUpperCase()
              : formatEventWhen(headline.startsAt)}
          </span>
        </button>
      </Dialog.Trigger>

      <Dialog.Content maxWidth="480px" className={styles.dialog}>
        <VisuallyHidden>
          <Dialog.Description>
            Clan event standings and the next scheduled event.
          </Dialog.Description>
        </VisuallyHidden>

        <div className={styles.header}>
          {headline.icon && (
            <ItemImageWithFallback itemName={headline.icon} size={40} />
          )}
          <div className={styles.headerText}>
            <Dialog.Title className={styles.title}>
              {headline.name}
            </Dialog.Title>
            <span className={styles.subtitle}>
              {headline.typeLabel}
              {active ? ` · ends ${formatEventWhen(active.endsAt)}` : ''}
            </span>
          </div>
        </div>

        {active ? (
          <>
            {/*
              Four states, because the standings arrive after the event does.
              "Still loading" and "Temple could not be reached" are different
              things to be told, and neither may be shown as an empty table.
            */}
            {!standings && !hasTried ? (
              <p className={styles.note}>Loading the standings…</p>
            ) : !standings || standings.standingsUnavailable ? (
              <p className={styles.note}>
                TempleOSRS could not be reached, so the standings are unknown
                right now. The event is still running.
              </p>
            ) : standings.standings.length === 0 ? (
              <p className={styles.note}>
                Nobody has gained anything yet. First one in takes the lead.
              </p>
            ) : (
              <ol className={styles.standings}>
                {standings.standings.map((entry) => (
                  <li
                    key={entry.playerName}
                    className={`${styles.standing} ${
                      entry.position === 1 ? styles.standingLeader : ''
                    }`}
                  >
                    <span className={styles.position}>{entry.position}</span>
                    <PlayerNameButton
                      name={entry.playerName}
                      className={styles.standingName}
                    />
                    <span className={styles.gained}>
                      {entry.gained.toLocaleString()}
                      <span className={styles.gainedUnit}>
                        {clanEventGainLabel[active.type]}
                      </span>
                    </span>
                  </li>
                ))}
              </ol>
            )}

            <div className={styles.footer}>
              <span className={styles.footerMeta}>
                {standings
                  ? `${standings.participantCount.toLocaleString()} entered`
                  : ''}
              </span>
              <a
                className={styles.footerLink}
                href={`${clientConstants.temple.baseUrl}/competitions/standings.php?id=${active.id}`}
                target="_blank"
                rel="noreferrer"
              >
                Full standings on TempleOSRS
              </a>
            </div>
          </>
        ) : (
          <p className={styles.note}>
            Starts {formatEventWhen(headline.startsAt)} and runs until{' '}
            {formatEventWhen(headline.endsAt)}.
          </p>
        )}

        {/* Hidden entirely when nothing is queued — there is no "TBC" to show. */}
        {active && next && (
          <p className={styles.nextUp}>
            <span className={styles.nextUpLabel}>Up next</span>
            {next.name} — {next.typeLabel}, {formatEventWhen(next.startsAt)}.
          </p>
        )}
      </Dialog.Content>
    </Dialog.Root>
  );
}
