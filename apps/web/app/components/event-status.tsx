'use client';

import { useEffect, useState } from 'react';
import { Dialog, VisuallyHidden } from '@radix-ui/themes';
import { clanEventGainLabel } from '@/config/clan-events';
import { clientConstants } from '@/config/constants.client';
import type { ClanEventStatus } from '@/app/data-sources/fetch-clan-event-status';
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
export function EventStatus() {
  const [status, setStatus] = useState<ClanEventStatus | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;

    fetch('/api/clan-events/status')
      .then((response) => response.json())
      .then((result: { success: boolean; data?: ClanEventStatus }) => {
        if (!cancelled && result.success && result.data) {
          setStatus(result.data);
        }
      })
      // A missing indicator is the right failure here — the nav bar must not
      // report that the site could not reach Temple.
      .catch((error: unknown) => {
        console.error('Could not load clan event status:', error);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (!status || (!status.active && !status.next)) {
    return null;
  }

  const { active, next } = status;
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
              : `${headline.name} starts ${formatWhen(headline.startsAt)} — open event details`
          }
        >
          <span className={styles.pulse} aria-hidden />
          <span className={styles.triggerLabel}>
            {active ? active.metricName : 'Next event'}
          </span>
          <span className={styles.triggerMeta}>
            {active ? active.type.toUpperCase() : formatWhen(headline.startsAt)}
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
              {active ? ` · ends ${formatWhen(active.endsAt)}` : ''}
            </span>
          </div>
        </div>

        {active ? (
          <>
            {active.standingsUnavailable ? (
              <p className={styles.note}>
                TempleOSRS could not be reached, so the standings are unknown
                right now. The event is still running.
              </p>
            ) : active.standings.length === 0 ? (
              <p className={styles.note}>
                Nobody has gained anything yet. First one in takes the lead.
              </p>
            ) : (
              <ol className={styles.standings}>
                {active.standings.map((entry) => (
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
                {active.participantCount.toLocaleString()} entered
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
            Starts {formatWhen(headline.startsAt)} and runs until{' '}
            {formatWhen(headline.endsAt)}.
          </p>
        )}

        {/* Hidden entirely when nothing is queued — there is no "TBC" to show. */}
        {active && next && (
          <p className={styles.nextUp}>
            <span className={styles.nextUpLabel}>Up next</span>
            {next.name} — {next.typeLabel}, {formatWhen(next.startsAt)}.
          </p>
        )}
      </Dialog.Content>
    </Dialog.Root>
  );
}

/**
 * "in 3 days", "in 5 hours", "2 hours ago" — coarse on purpose. The exact
 * instant is on Temple; what a member wants from the nav bar is whether there
 * is still time.
 */
function formatWhen(iso: string): string {
  const target = new Date(iso).getTime();
  const deltaMinutes = Math.round((target - Date.now()) / 60_000);
  const absolute = Math.abs(deltaMinutes);

  const relative = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

  if (absolute < 60) {
    return relative.format(deltaMinutes, 'minute');
  }

  if (absolute < 60 * 24) {
    return relative.format(Math.round(deltaMinutes / 60), 'hour');
  }

  return relative.format(Math.round(deltaMinutes / (60 * 24)), 'day');
}
