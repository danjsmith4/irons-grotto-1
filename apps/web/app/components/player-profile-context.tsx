'use client';

import { createContext, useContext, useState, ReactNode } from 'react';
import { PlayerProfileModal } from './player-profile-modal';

interface PlayerProfileContextValue {
  openProfile: (playerName: string) => void;
}

const PlayerProfileContext = createContext<PlayerProfileContextValue | null>(
  null,
);

/**
 * App-wide host for the player profile modal. Any component under this provider
 * can call `usePlayerProfile().openProfile(name)` to open a player's profile —
 * so every player name in the app (leaderboard, feeds, tables) is clickable.
 */
export function PlayerProfileProvider({ children }: { children: ReactNode }) {
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);

  return (
    <PlayerProfileContext.Provider value={{ openProfile: setSelectedPlayer }}>
      {children}
      <PlayerProfileModal
        playerName={selectedPlayer}
        onClose={() => setSelectedPlayer(null)}
      />
    </PlayerProfileContext.Provider>
  );
}

export function usePlayerProfile() {
  const ctx = useContext(PlayerProfileContext);
  if (!ctx) {
    throw new Error(
      'usePlayerProfile must be used within a PlayerProfileProvider',
    );
  }
  return ctx;
}
