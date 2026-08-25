'use client';

import Link from 'next/link';
import { PersonIcon } from '@radix-ui/react-icons';
import styles from '../join.module.css';

interface RsnFieldProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (value: string) => void;
  error?: string | null;
  /**
   * A way out of the error, when there is one. "You already have this account"
   * is only useful next to a link to it — an error that names a dead end is
   * worse than one that names a fix.
   */
  errorLink?: { href: string; label: string } | null;
  disabled?: boolean;
}

/**
 * The one thing the player types.
 *
 * ⚠️ **Deliberately not a search.** This was briefly a combobox that
 * fuzzy-matched the clan roster and offered names to pick from, and it was
 * wrong twice over: a member is typing *their own* name, which they do not need
 * help finding, and almost every name it could suggest belongs to someone who
 * already has an account here — so it led with options that the availability
 * check immediately rejects. Suggesting a name that cannot be used is worse
 * than suggesting nothing.
 *
 * The game-mode helmet still appears, where it actually means something: beside
 * the player's name once TempleOSRS has told us what kind of account it is.
 */
export function RsnField({
  value,
  onChange,
  onSubmit,
  error,
  errorLink,
  disabled,
}: RsnFieldProps) {
  return (
    <div className={styles.field}>
      <div
        className={`${styles.fieldShell} ${error ? styles.fieldShellError : ''}`}
      >
        <PersonIcon width={18} height={18} color="rgb(var(--ig-text-muted))" />
        <input
          className={styles.fieldInput}
          value={value}
          disabled={disabled}
          maxLength={12}
          // Nothing about an RSN benefits from the browser's guesses, and a
          // saved-address dropdown over this field is pure noise.
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          placeholder="Your RuneScape name"
          aria-label="Your RuneScape name"
          aria-invalid={Boolean(error)}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              onSubmit(value);
            }
          }}
        />
      </div>

      {error ? (
        <p className={styles.fieldError}>
          {error}
          {errorLink && (
            <>
              {' '}
              <Link className={styles.inlineLink} href={errorLink.href}>
                {errorLink.label}
              </Link>
            </>
          )}
        </p>
      ) : (
        <p className={styles.fieldHint}>
          Spelling and spacing have to match the game exactly.
        </p>
      )}
    </div>
  );
}
