'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  RecentClogsScroller,
  deserializeRecentClogItem,
  type RecentClogItem,
  type SerializedRecentClogItem,
} from './recent-clogs-scroller';

const PAGE_SIZE = 20;

interface RecentClogsContainerProps {
  initialItems: RecentClogItem[];
  playerNames: string[];
}

async function fetchClogPage(playerNames: string[], offset: number) {
  const response = await fetch('/api/user-recent-clogs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ playerNames, limit: PAGE_SIZE, offset }),
  });

  if (!response.ok) return null;

  const body = (await response.json()) as {
    success?: boolean;
    data?: SerializedRecentClogItem[];
  };
  if (!body.success || !body.data) return null;

  // The API is JSON, so `dateFirstLogged` arrives as a string — rehydrate it
  // here so everything downstream can rely on it being a Date.
  return body.data.map(deserializeRecentClogItem);
}

export function RecentClogsContainer({
  initialItems,
  playerNames,
}: RecentClogsContainerProps) {
  // The dashboard normally server-renders the first page; when it doesn't, we
  // fetch it here rather than in a parent, so items/offset/hasMore stay in sync.
  const needsInitialLoad =
    initialItems.length === 0 && playerNames.length > 0;

  const [items, setItems] = useState<RecentClogItem[]>(initialItems);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(needsInitialLoad);
  const [hasMore, setHasMore] = useState(initialItems.length === PAGE_SIZE);
  const [offset, setOffset] = useState(initialItems.length);

  useEffect(() => {
    if (!needsInitialLoad) return;

    let cancelled = false;

    const loadInitialPage = async () => {
      try {
        const page = await fetchClogPage(playerNames, 0);
        if (cancelled) return;

        if (page && page.length > 0) {
          setItems(page);
          setOffset(page.length);
          setHasMore(page.length === PAGE_SIZE);
        } else {
          setHasMore(false);
        }
      } catch (error) {
        console.error('Failed to load initial clogs:', error);
        if (!cancelled) setHasMore(false);
      } finally {
        if (!cancelled) setInitialLoading(false);
      }
    };

    void loadInitialPage();

    return () => {
      cancelled = true;
    };
  }, [needsInitialLoad, playerNames.join(',')]);

  const loadMore = useCallback(async () => {
    if (loading || initialLoading || playerNames.length === 0) return;

    setLoading(true);
    try {
      const page = await fetchClogPage(playerNames, offset);

      if (page && page.length > 0) {
        setItems((prev) => [...prev, ...page]);
        setOffset((prev) => prev + page.length);
        setHasMore(page.length === PAGE_SIZE);
      } else {
        setHasMore(false);
      }
    } catch (error) {
      console.error('Failed to load more clogs:', error);
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  }, [loading, initialLoading, playerNames, offset]);

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
