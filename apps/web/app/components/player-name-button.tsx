'use client';

import { CSSProperties, ReactNode } from 'react';
import { usePlayerProfile } from './player-profile-context';

interface PlayerNameButtonProps {
  name: string;
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
}

/**
 * A player name rendered as a button that opens the player profile modal.
 * Use this anywhere a clan member's name appears (outside the rank calculator).
 */
export function PlayerNameButton({
  name,
  className,
  style,
  children,
}: PlayerNameButtonProps) {
  const { openProfile } = usePlayerProfile();

  return (
    <button
      type="button"
      className={className}
      style={{
        font: 'inherit',
        background: 'none',
        border: 'none',
        padding: 0,
        cursor: 'pointer',
        ...style,
      }}
      onClick={() => openProfile(name)}
    >
      {children ?? name}
    </button>
  );
}
