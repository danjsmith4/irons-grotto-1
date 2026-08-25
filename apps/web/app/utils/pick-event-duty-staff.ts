/** A staff member who could be put on event-setup duty. */
export interface EventDutyCandidate {
  playerName: string;
  discordUserId: string;
}

/**
 * Rolls a staff member onto event-setup duty.
 *
 * The pool is everyone who can reach `/admin` — the elevated roles — because
 * duty is "go and create the event", and nobody outside that set can.
 *
 * Whoever is already on duty is excluded, so a re-roll actually rerolls: with
 * a small staff, a plain random pick lands on the same person often enough to
 * make the button look broken. They come back into the pool as soon as someone
 * else holds duty, and if they are the *only* candidate they stay on it —
 * excluding the last person from a pool of one would return nobody.
 *
 * `random` is injected so the roll can be tested; it takes the place of
 * `Math.random` and must return a value in [0, 1).
 */
export function pickEventDutyStaff(
  candidates: EventDutyCandidate[],
  currentlyOnDuty: string | null,
  random: () => number = Math.random,
): EventDutyCandidate | null {
  if (candidates.length === 0) {
    return null;
  }

  const eligible =
    candidates.length > 1 && currentlyOnDuty
      ? candidates.filter(
          (candidate) => candidate.playerName !== currentlyOnDuty,
        )
      : candidates;

  // A filter that removed everyone (the only candidate was the one on duty)
  // falls back to the full pool rather than returning nobody.
  const pool = eligible.length > 0 ? eligible : candidates;

  return pool[Math.floor(random() * pool.length)] ?? null;
}
