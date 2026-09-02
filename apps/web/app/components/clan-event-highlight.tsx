'use client';

import { useEffect, useState } from 'react';
import { clientConstants } from '@/config/constants.client';
import type { ClanEventSummary } from '@/app/data-sources/fetch-clan-event-status';
import type { PublicClanEventStatus } from '@/app/data-sources/fetch-public-clan-event';
import { formatEventWhen } from '@/app/utils/format-event-when';
import { ItemImageWithFallback } from './item-image-with-fallback';
import styles from './clan-event-highlight.module.css';

interface ClanEventHighlightProps {
  /**
   * The events, straight from our database, rendered on the server.
   *
   * ⚠️ **This is what draws the strip, and it must not depend on TempleOSRS** —
   * the same rule the nav indicator follows. Whether an event is running is a
   * fact we own; only the entrant count belongs to Temple, and the homepage is
   * the last page that should wait on a third party to paint.
   */
  events: { active: ClanEventSummary | null; next: ClanEventSummary | null };
}

/**
 * The clan's current competition, on the public homepage.
 *
 * The homepage is the only page with no nav bar, and signed-in visitors are
 * redirected off it — so this is the one place a live event was invisible, to
 * exactly the people the "this clan is active" signal is for. Members already
 * have the indicator in the nav.
 *
 * Written for a stranger rather than a member: the metric, the clock and how
 * many are entered. Not the standings — a list of names means nothing to
 * someone who knows none of them, and they are a click away on Temple for
 * anyone who wants them.
 *
 * Renders nothing at all when there is neither a running nor a queued event.
 */
export function ClanEventHighlight({ events }: ClanEventHighlightProps) {
  const { active, next } = events;
  const [participantCount, setParticipantCount] = useState<number | null>(null);

  /*
   * The entrant count, fetched after the strip is already on screen.
   *
   * Nothing waits on it: a missing count costs one clause of the sentence,
   * where a missing strip would cost the whole point of it. Skipped entirely
   * when nothing is running, since a queued event has no entrants yet.
   */
  useEffect(() => {
    if (!active) {
      return undefined;
    }

    const controller = new AbortController();

    fetch('/api/clan-events/public', { signal: controller.signal })
      .then((response) => response.json())
      .then((result: { success: boolean; data?: PublicClanEventStatus }) => {
        if (result.success && result.data?.active) {
          setParticipantCount(result.data.active.participantCount);
        }
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          console.error('Could not load clan event entrants:', error);
        }
      });

    return () => controller.abort();
  }, [active]);

  const headline = active ?? next;

  if (!headline) {
    return null;
  }

  return (
    <section
      className={`${styles.strip} ${active ? styles.stripLive : ''}`}
      /*
       * Built from the type and the metric rather than from `name`, which is
       * whatever Temple stored — it flattens and truncates what we send, so
       * this event's name comes back as "Theatre Of Blood Hard Mode Bot". Fine
       * as a record of what is on Temple; not something to read aloud.
       */
      aria-label={
        active
          ? `${headline.typeLabel}: ${headline.metricName} is running now`
          : `${headline.typeLabel}: ${headline.metricName} starts ${formatEventWhen(headline.startsAt)}`
      }
    >
      <span className={styles.pulse} aria-hidden />

      {headline.icon && (
        <ItemImageWithFallback
          itemName={headline.icon}
          size={38}
          className={styles.icon}
        />
      )}

      <div className={styles.body}>
        <span className={styles.eyebrow}>
          {active ? 'Running now' : 'Up next'}
        </span>
        <p className={styles.headline}>
          {headline.typeLabel}
          <span className={styles.separator} aria-hidden>
            ·
          </span>
          <span className={styles.metric}>{headline.metricName}</span>
        </p>
        {/*
          Relative to whenever it is rendered, which the server and the browser
          answer a few milliseconds apart — enough to disagree across a rounding
          boundary and nothing more, so the mismatch is suppressed rather than
          deferred to an effect that would flash an empty slot on every load.
        */}
        <p className={styles.meta} suppressHydrationWarning>
          {active
            ? `Ends ${formatEventWhen(headline.endsAt)}`
            : `Starts ${formatEventWhen(headline.startsAt)}`}
          {participantCount !== null && (
            <>
              <span className={styles.separator} aria-hidden>
                ·
              </span>
              {participantCount.toLocaleString()} competing
            </>
          )}
        </p>
      </div>

      {active && (
        <a
          className={styles.link}
          href={`${clientConstants.temple.baseUrl}/competitions/standings.php?id=${active.id}`}
          target="_blank"
          rel="noreferrer"
        >
          Standings
        </a>
      )}
    </section>
  );
}
