'use client';

import { useState, useEffect } from 'react';
import { RecentClogsContainer } from './recent-clogs-container';
import type { RecentClogItem } from './recent-clogs-scroller';

interface ClientRecentClogsProps {
  playerNames: string[];
  initialItems: RecentClogItem[];
}

export function ClientRecentClogs({
  playerNames,
  initialItems,
}: ClientRecentClogsProps) {
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [items, setItems] = useState<RecentClogItem[]>(initialItems);

  useEffect(() => {
    // If we have player names but no initial items, we should load them
    if (playerNames.length > 0 && initialItems.length === 0) {
      const loadInitialData = async () => {
        try {
          const response = await fetch('/api/user-recent-clogs', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              playerNames,
              limit: 20,
              offset: 0,
            }),
          });

          if (response.ok) {
            const data = (await response.json()) as {
              success?: boolean;
              data?: RecentClogItem[];
            };
            if (data.success && data.data) {
              setItems(data.data);
            }
          }
        } catch (error) {
          console.error('Failed to load initial clogs:', error);
        } finally {
          setIsInitialLoad(false);
        }
      };

      void loadInitialData();
    } else {
      setIsInitialLoad(false);
    }
  }, [playerNames, initialItems.length]);

  return (
    <RecentClogsContainer
      initialItems={items}
      playerNames={playerNames}
      initialLoading={isInitialLoad && playerNames.length > 0}
    />
  );
}
