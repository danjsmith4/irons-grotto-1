'use client';

import { useState, useEffect, useRef } from 'react';
import { ChevronRightIcon } from '@radix-ui/react-icons';
import { Tooltip } from '@radix-ui/themes';
import { ItemImageWithFallback } from './item-image-with-fallback';
import { formatTimeAgo } from '@/app/utils/format-time-ago';

export interface RecentClogItem {
  playerName: string;
  itemName: string;
  itemId: number;
  itemCategory: string;
  dateFirstLogged: Date;
}

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

  if (initialLoading) {
    return (
      <Tooltip content="Your latest clogs">
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '3rem',
            background: 'rgba(206, 147, 216, 0.1)',
            borderRadius: '12px',
            border: '1px solid rgba(206, 147, 216, 0.2)',
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
                border: '3px solid rgba(206, 147, 216, 0.3)',
                borderTop: '3px solid #ce93d8',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
              }}
            />
            <div
              style={{
                color: 'rgba(255, 255, 255, 0.7)',
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
            background: 'rgba(206, 147, 216, 0.1)',
            borderRadius: '12px',
            border: '1px solid rgba(206, 147, 216, 0.2)',
            color: 'rgba(255, 255, 255, 0.6)',
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
            background: 'rgba(206, 147, 216, 0.1)',
            borderRadius: '12px',
            border: '1px solid rgba(206, 147, 216, 0.2)',
            scrollbarWidth: 'thin',
            scrollbarColor: 'rgba(206, 147, 216, 0.5) transparent',
          }}
        >
          {items.map((item, index) => (
            <div
              key={`${item.playerName}-${item.itemId}-${index}`}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '0.5rem',
                minWidth: '120px',
                padding: '1rem',
                background: 'rgba(26, 13, 46, 0.8)',
                borderRadius: '8px',
                border: '1px solid rgba(206, 147, 216, 0.3)',
                transition: 'all 0.3s ease',
                animation: `fadeIn 0.5s ease ${index * 0.1}s both`,
              }}
            >
              <ItemImageWithFallback
                itemId={item.itemId}
                itemName={item.itemName}
                size={48}
                style={{
                  filter: 'drop-shadow(0 2px 8px rgba(233, 30, 99, 0.3))',
                }}
              />
              <div
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 500,
                  textAlign: 'center',
                  color: '#ce93d8',
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
              <div
                style={{
                  fontSize: '0.7rem',
                  color: '#e91e63',
                  fontWeight: 600,
                  textAlign: 'center',
                }}
              >
                {item.playerName}
              </div>
              <div
                style={{
                  fontSize: '0.65rem',
                  color: 'rgba(255, 255, 255, 0.6)',
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
                  background: 'rgba(26, 13, 46, 0.6)',
                  borderRadius: '8px',
                  border: '1px solid rgba(206, 147, 216, 0.2)',
                  opacity: 0.7,
                }}
              >
                <div
                  style={{
                    width: '48px',
                    height: '48px',
                    background: 'rgba(206, 147, 216, 0.2)',
                    borderRadius: '4px',
                    animation: 'pulse 2s infinite',
                  }}
                />
                <div
                  style={{
                    width: '80px',
                    height: '12px',
                    background: 'rgba(206, 147, 216, 0.2)',
                    borderRadius: '2px',
                    animation: 'pulse 2s infinite 0.2s both',
                  }}
                />
                <div
                  style={{
                    width: '60px',
                    height: '10px',
                    background: 'rgba(233, 30, 99, 0.2)',
                    borderRadius: '2px',
                    animation: 'pulse 2s infinite 0.4s both',
                  }}
                />
                <div
                  style={{
                    width: '50px',
                    height: '8px',
                    background: 'rgba(255, 255, 255, 0.1)',
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
              right: '1rem',
              top: '50%',
              transform: 'translateY(-50%)',
              background: 'rgba(233, 30, 99, 0.9)',
              borderRadius: '50%',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              animation: 'pulse 2s infinite',
              pointerEvents: 'none',
            }}
          >
            <ChevronRightIcon style={{ color: 'white' }} />
          </div>
        )}

        <style jsx>{`
          @keyframes fadeIn {
            from {
              opacity: 0;
              transform: translateY(20px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }

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
            background: rgba(206, 147, 216, 0.5);
            border-radius: 3px;
          }

          div::-webkit-scrollbar-thumb:hover {
            background: rgba(206, 147, 216, 0.7);
          }
        `}</style>
      </div>
    </Tooltip>
  );
}
