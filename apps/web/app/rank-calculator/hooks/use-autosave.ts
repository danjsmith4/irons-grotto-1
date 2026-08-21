'use client';

import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useFormContext } from 'react-hook-form';
import { debounce } from 'lodash';
import {
  PlayerEditableFields,
  PlayerEditableSchema,
} from '../[player]/actions/update-player-state-action';
import { RankCalculatorSchema } from '../[player]/submit-rank-calculator-validation';

/**
 * How long to wait after the last change before writing.
 *
 * Long enough that ticking twenty notable items in a row lands as one request,
 * short enough that a change is stored well before anyone navigates away.
 * `mode: 'onBlur'` means validation is already blur-scoped, so there is nothing
 * to gain from going lower.
 */
const debounceMs = 800;

/** Fields the player owns, and so the only ones autosave ever sends. */
const editableKeys = Object.keys(
  PlayerEditableSchema.shape,
) as (keyof PlayerEditableFields)[];

type FormValues = Omit<RankCalculatorSchema, 'rank' | 'points'>;

/**
 * The changed subset of the player-owned fields, or null if nothing moved.
 *
 * Compared against the last values known to be stored rather than against the
 * form's initial state, so a field edited, reverted, and edited again is still
 * seen. Exported for its own spec — the diffing is the part worth testing, and
 * it is pure.
 */
export function buildPlayerPatch(
  values: Partial<FormValues>,
  committed: Partial<FormValues>,
): PlayerEditableFields | null {
  const patch: Record<string, unknown> = {};

  editableKeys.forEach((key) => {
    const next = values[key as keyof FormValues];
    const previous = committed[key as keyof FormValues];

    // Structural compare: `acquiredItems` and `achievementDiaries` are objects
    // that react-hook-form replaces wholesale on every edit, so identity says
    // nothing.
    if (JSON.stringify(next) !== JSON.stringify(previous)) {
      patch[key] = next;
    }
  });

  return Object.keys(patch).length > 0 ? (patch as PlayerEditableFields) : null;
}

interface UseAutosaveOptions {
  /** Persists a patch. Resolves false if the write did not land. */
  save: (patch: PlayerEditableFields) => Promise<boolean>;
  onError: () => void;
}

/**
 * Persists the player's edits as they make them.
 *
 * There is no save step, and deliberately no save *affordance* either — no
 * button, no "Saved ✓", no toast on success. An edit applying and staying
 * applied is the expected case and does not need reporting; the UI only speaks
 * up when a write fails, which is the one thing the player could not otherwise
 * know.
 *
 * Flushes immediately on tab hide, so a change made and then dismissed is not
 * lost inside the debounce window.
 */
export function useAutosave({ save, onError }: UseAutosaveOptions) {
  const { watch, getValues } = useFormContext<FormValues>();

  // What we believe is stored. Seeded from the values the server rendered.
  const committed = useRef<Partial<FormValues>>(getValues());
  const inFlight = useRef(false);

  const flush = useCallback(async () => {
    if (inFlight.current) return;

    const patch = buildPlayerPatch(getValues(), committed.current);

    if (!patch) return;

    inFlight.current = true;

    try {
      const stored = await save(patch);

      if (stored) {
        // Merge rather than replace: the player may have edited something else
        // while this request was in flight, and that change is not stored yet.
        committed.current = { ...committed.current, ...patch };
      } else {
        onError();
      }
    } catch {
      onError();
    } finally {
      inFlight.current = false;
    }
  }, [getValues, save, onError]);

  // Memoised so the debounce is created once. Built inline it would be a new
  // timer on every render, which debounces nothing.
  const scheduleFlush = useMemo(
    () => debounce(() => void flush(), debounceMs),
    [flush],
  );

  useEffect(() => {
    const subscription = watch(() => scheduleFlush());

    return () => subscription.unsubscribe();
  }, [watch, scheduleFlush]);

  useEffect(() => {
    const onHidden = () => {
      if (document.visibilityState === 'hidden') {
        scheduleFlush.flush();
      }
    };

    document.addEventListener('visibilitychange', onHidden);

    return () => {
      document.removeEventListener('visibilitychange', onHidden);
      scheduleFlush.flush();
    };
  }, [scheduleFlush]);

  /** Forces any pending change out now — used before applying for a rank. */
  const flushNow = useCallback(async () => {
    scheduleFlush.cancel();
    await flush();
  }, [scheduleFlush, flush]);

  return { flushNow };
}
