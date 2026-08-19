'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { ChevronRightIcon } from '@radix-ui/react-icons';
import { Tooltip } from '@radix-ui/themes';
import { ItemImageWithFallback } from './item-image-with-fallback';
import { PlayerNameButton } from './player-name-button';
import { formatTimeAgo } from '@/app/utils/format-time-ago';

export interface RecentClogItem {
  playerName: string;
  itemName: string;
  itemId: number;
  itemCategory: string;
  dateFirstLogged: Date;
}

/**
 * Shape the paginated `/api/user-recent-clogs` responses actually have: JSON
 * has no Date, so `dateFirstLogged` arrives as an ISO string.
 */
export type SerializedRecentClogItem = Omit<
  RecentClogItem,
  'dateFirstLogged'
> & {
  dateFirstLogged: string | Date;
};

/** Rehydrate a fetched item so `RecentClogItem`'s `Date` contract holds. */
export function deserializeRecentClogItem(
  item: SerializedRecentClogItem,
): RecentClogItem {
  return { ...item, dateFirstLogged: new Date(item.dateFirstLogged) };
}

const MAX_ITEMS_PER_SYNC = 5;

interface RecentClogsScrollerProps {
  items: RecentClogItem[];
  onLoadMore?: () => void;
  hasMore?: boolean;
  loading?: boolean;
  initialLoading?: boolean;
}

export function RecentClogsScroller({
  items,
  onLoadMore,
  hasMore = false,
  loading = false,
  initialLoading = false,
}: RecentClogsScrollerProps) {
  const [showScrollHint, setShowScrollHint] = useState(true);
  const [isMounted, setIsMounted] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;

    const handleScroll = () => {
      setShowScrollHint(false);

      // Load more when near the end - trigger much earlier
      if (hasMore && !loading && onLoadMore) {
        const { scrollLeft, scrollWidth, clientWidth } = container;
        if (scrollLeft + clientWidth >= scrollWidth - 300) {
          onLoadMore();
        }
      }
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [hasMore, loading, onLoadMore]);

  // A player syncing a large chunk of their clog at once lands as many rows
  // sharing one timestamp; keep the newest few so one sync can't flood the rail.
  const filteredItems = useMemo(() => {
    const countsPerSync = new Map<string, number>();

    return items.filter((item) => {
      const key = `${item.playerName}|${item.dateFirstLogged.getTime()}`;
      const count = countsPerSync.get(key) ?? 0;
      if (count >= MAX_ITEMS_PER_SYNC) return false;

      countsPerSync.set(key, count + 1);
      return true;
    });
  }, [items]);

  if (initialLoading) {
    return (
      <Tooltip content="Your latest clogs">
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '3rem',
            background: 'rgb(var(--ig-text-muted) / 0.1)',
            borderRadius: '12px',
            border: '1px solid rgb(var(--ig-text-muted) / 0.2)',
          }}
        >
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '1rem',
            }}
          >
            <div
              style={{
                width: '40px',
                height: '40px',
                border: '3px solid rgb(var(--ig-text-muted) / 0.3)',
                borderTop: '3px solid rgb(var(--ig-text-light))',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
              }}
            />
            <div
              style={{
                color: 'rgb(var(--ig-text-muted))',
                fontSize: '0.9rem',
                fontWeight: 500,
              }}
            >
              Loading your latest collection logs...
            </div>
          </div>
        </div>
      </Tooltip>
    );
  }

  if (items.length === 0) {
    return (
      <Tooltip content="Your latest clogs">
        <div
          style={{
            padding: '1rem',
            background: 'rgb(var(--ig-text-muted) / 0.1)',
            borderRadius: '12px',
            border: '1px solid rgb(var(--ig-text-muted) / 0.2)',
            color: 'rgb(var(--ig-text-muted))',
            textAlign: 'center',
          }}
        >
          No collection log items found
        </div>
      </Tooltip>
    );
  }

  return (
    <Tooltip content="Your latest clogs">
      <div style={{ position: 'relative' }}>
        <div
          ref={scrollRef}
          style={{
            display: 'flex',
            gap: '1rem',
            overflowX: 'auto',
            overflowY: 'hidden',
            padding: '1rem',
            background: 'rgb(var(--ig-surface) / 0.6)',
            borderRadius: '12px',
            border: '1px solid rgb(var(--ig-text-muted) / 0.1)',
            scrollbarWidth: 'thin',
            scrollbarColor: 'rgb(var(--ig-text-muted) / 0.3) transparent',
          }}
        >
          {filteredItems.map((item, index) => (
            <div
              key={`${item.playerName}-${item.itemId}-${index}`}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '0.5rem',
                minWidth: '120px',
                padding: '1rem',
                background: 'rgb(var(--ig-surface-2) / 0.9)',
                borderRadius: '10px',
                border: '1px solid rgb(var(--ig-text-muted) / 0.12)',
                transition: 'border-color 0.15s ease',
              }}
            >
              <ItemImageWithFallback
                itemId={item.itemId}
                itemName={item.itemName}
                size={48}
              />
              <div
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 500,
                  textAlign: 'center',
                  color: 'rgb(var(--ig-text-light))',
                  lineHeight: '1.2',
                  maxWidth: '100px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                }}
              >
                {item.itemName}
              </div>
              <PlayerNameButton
                name={item.playerName}
                style={{
                  fontSize: '0.7rem',
                  color: 'rgb(var(--ig-secondary))',
                  fontWeight: 600,
                  textAlign: 'center',
                }}
              />
              <div
                style={{
                  fontSize: '0.65rem',
                  fontFamily: 'var(--font-mono), ui-monospace, monospace',
                  color: 'rgb(var(--ig-text-muted))',
                  textAlign: 'center',
                }}
              >
                {isMounted
                  ? formatTimeAgo(new Date(item.dateFirstLogged))
                  : '...'}
              </div>
            </div>
          ))}

          {loading &&
            Array.from({ length: 3 }, (_, i) => (
              <div
                key={`skeleton-${i}`}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '0.5rem',
                  minWidth: '120px',
                  padding: '1rem',
                  background: 'rgb(var(--ig-surface-2) / 0.6)',
                  borderRadius: '8px',
                  border: '1px solid rgb(var(--ig-text-muted) / 0.2)',
                  opacity: 0.7,
                }}
              >
                <div
                  style={{
                    width: '48px',
                    height: '48px',
                    background: 'rgb(var(--ig-text-muted) / 0.2)',
                    borderRadius: '4px',
                    animation: 'pulse 2s infinite',
                  }}
                />
                <div
                  style={{
                    width: '80px',
                    height: '12px',
                    background: 'rgb(var(--ig-text-muted) / 0.2)',
                    borderRadius: '2px',
                    animation: 'pulse 2s infinite 0.2s both',
                  }}
                />
                <div
                  style={{
                    width: '60px',
                    height: '10px',
                    background: 'rgb(var(--ig-secondary) / 0.2)',
                    borderRadius: '2px',
                    animation: 'pulse 2s infinite 0.4s both',
                  }}
                />
                <div
                  style={{
                    width: '50px',
                    height: '8px',
                    background: 'rgb(var(--ig-text-muted) / 0.1)',
                    borderRadius: '2px',
                    animation: 'pulse 2s infinite 0.6s both',
                  }}
                />
              </div>
            ))}
        </div>

        {showScrollHint && hasMore && (
          <div
            style={{
              position: 'absolute',
              right: 0,
              top: 0,
              bottom: 0,
              width: '48px',
              borderRadius: '0 12px 12px 0',
              background:
                'linear-gradient(90deg, transparent, rgb(var(--ig-bg) / 0.6))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              paddingRight: '0.5rem',
              color: 'rgb(var(--ig-text-muted))',
              pointerEvents: 'none',
            }}
          >
            <ChevronRightIcon />
          </div>
        )}

        <style jsx>{`
          @keyframes spin {
            0% {
              transform: rotate(0deg);
            }
            100% {
              transform: rotate(360deg);
            }
          }

          @keyframes pulse {
            0%,
            100% {
              opacity: 0.7;
            }
            50% {
              opacity: 1;
            }
          }

          div::-webkit-scrollbar {
            height: 6px;
          }

          div::-webkit-scrollbar-track {
            background: transparent;
          }

          div::-webkit-scrollbar-thumb {
            background: rgb(var(--ig-text-muted) / 0.5);
            border-radius: 3px;
          }

          div::-webkit-scrollbar-thumb:hover {
            background: rgb(var(--ig-text-muted) / 0.7);
          }
        `}</style>
      </div>
    </Tooltip>
  );
}
