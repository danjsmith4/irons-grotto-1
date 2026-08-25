'use client';

import { useId, useMemo, useRef, useState } from 'react';
import { MagnifyingGlassIcon } from '@radix-ui/react-icons';
import { search } from 'fast-fuzzy';
import { AccountTypeBadge } from '@/app/components/account-type-badge';
import type { DirectoryMember } from '@/app/data-sources/fetch-member-directory';
import styles from '../join.module.css';

interface RsnSearchProps {
  members: DirectoryMember[];
  value: string;
  onChange: (value: string) => void;
  onSubmit: (value: string) => void;
  error?: string | null;
  disabled?: boolean;
}

/** How many roster matches to offer. More than this is a list, not a hint. */
const maxSuggestions = 6;

/**
 * The one thing the player types.
 *
 * The roster suggestions carry each member's **game-mode helmet**, so picking
 * your name out of the list is recognising your account rather than reading a
 * string — the same badge the leaderboard puts in front of a name. Members this
 * site has not seen before have no badge, and get a blank slot rather than a
 * placeholder icon, so the names stay on one left edge.
 */
export function RsnSearch({
  members,
  value,
  onChange,
  onSubmit,
  error,
  disabled,
}: RsnSearchProps) {
  const listId = useId();
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);

  const matches = useMemo(() => {
    if (!value.trim()) {
      return [];
    }

    // Exact-ish typing shouldn't be re-ranked out of the list: search on the
    // rsn but keep the member so the badge travels with it.
    return search(value, members, {
      keySelector: ({ rsn }) => rsn,
    }).slice(0, maxSuggestions);
  }, [value, members]);

  const showSuggestions = isOpen && matches.length > 0 && !disabled;

  function commit(next: string) {
    onChange(next);
    setIsOpen(false);
    setActiveIndex(-1);
    inputRef.current?.focus();
  }

  return (
    <div className={styles.field}>
      <div
        className={`${styles.fieldShell} ${error ? styles.fieldShellError : ''}`}
      >
        <MagnifyingGlassIcon
          width={18}
          height={18}
          color="rgb(var(--ig-text-muted))"
        />
        <input
          ref={inputRef}
          className={styles.fieldInput}
          value={value}
          disabled={disabled}
          maxLength={12}
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
          placeholder="Your RuneScape name"
          aria-label="Your RuneScape name"
          aria-expanded={showSuggestions}
          aria-controls={showSuggestions ? listId : undefined}
          aria-autocomplete="list"
          role="combobox"
          onChange={(event) => {
            onChange(event.target.value);
            setIsOpen(true);
            setActiveIndex(-1);
          }}
          onFocus={() => setIsOpen(true)}
          onBlur={() => {
            // Let a click on a suggestion land before the list closes.
            window.setTimeout(() => setIsOpen(false), 120);
          }}
          onKeyDown={(event) => {
            if (event.key === 'ArrowDown' && showSuggestions) {
              event.preventDefault();
              setActiveIndex((index) => (index + 1) % matches.length);

              return;
            }

            if (event.key === 'ArrowUp' && showSuggestions) {
              event.preventDefault();
              setActiveIndex(
                (index) => (index <= 0 ? matches.length : index) - 1,
              );

              return;
            }

            if (event.key === 'Escape') {
              setIsOpen(false);

              return;
            }

            if (event.key === 'Enter') {
              event.preventDefault();

              if (showSuggestions && activeIndex >= 0) {
                commit(matches[activeIndex].rsn);

                return;
              }

              onSubmit(value);
            }
          }}
        />
      </div>

      {showSuggestions && (
        <ul className={styles.suggestions} id={listId} role="listbox">
          {matches.map((member, index) => (
            <li key={member.rsn}>
              <button
                type="button"
                role="option"
                aria-selected={index === activeIndex}
                data-active={index === activeIndex}
                className={styles.suggestion}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => commit(member.rsn)}
              >
                <span className={styles.suggestionBadge}>
                  <AccountTypeBadge accountType={member.accountType} size={16} />
                </span>
                {member.rsn}
                {member.accountType === null && (
                  <span className={styles.suggestionMeta}>in clan</span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}

      {error ? (
        <p className={styles.fieldError}>{error}</p>
      ) : (
        <p className={styles.fieldHint}>
          Spelling and spacing have to match the game exactly.
        </p>
      )}
    </div>
  );
}
