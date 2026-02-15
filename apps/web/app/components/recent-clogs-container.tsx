'use client';

import { useState } from 'react';
import {
  RecentClogsScroller,
  type RecentClogItem,
} from './recent-clogs-scroller';

interface RecentClogsContainerProps {
  initialItems: RecentClogItem[];
  playerNames: string[];
  initialLoading?: boolean;
}

export function RecentClogsContainer({
  initialItems,
  playerNames,
  initialLoading = false,
}: RecentClogsContainerProps) {
  const [items, setItems] = useState<RecentClogItem[]>(initialItems);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(initialItems.length === 20); // Assume more if we got full page
  const [offset, setOffset] = useState(20);

  const loadMore = async () => {
    if (loading || playerNames.length === 0) return;

    setLoading(true);
    try {
      const response = await fetch('/api/user-recent-clogs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerNames,
          limit: 20,
          offset,
        }),
      });

      if (response.ok) {
        const data = (await response.json()) as {
          success: boolean;
          data: RecentClogItem[];
        };
        if (data.success && data.data && data.data.length > 0) {
          setItems((prev) => [...prev, ...data.data]);
          setOffset((prev) => prev + data.data.length);
          setHasMore(data.data.length === 20);
        } else {
          setHasMore(false);
        }
      } else {
        setHasMore(false);
      }
    } catch (error) {
      console.error('Failed to load more clogs:', error);
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <RecentClogsScroller
      items={items}
      onLoadMore={loadMore}
      hasMore={hasMore}
      loading={loading}
      initialLoading={initialLoading}
    />
  );
}
