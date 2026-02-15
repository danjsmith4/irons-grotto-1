'use client';

import { useState } from 'react';
import { Avatar } from '@radix-ui/themes';
import Image from 'next/image';
import { getRankImageUrl } from '@/app/rank-calculator/utils/get-rank-image-url';
import { getRankName } from '@/app/rank-calculator/utils/get-rank-name';
import { Rank } from '@/config/enums';
import { formatWikiImageUrl } from '../rank-calculator/utils/format-wiki-url';
import { clientConstants } from '@/config/constants.client';

export interface LeaderboardPlayer {
  playerName: string;
  rank: string | null;
  points: number;
  hasRadiant: boolean;
  hasBlorva: boolean;
  hasInfernal: boolean;
  hasQuiver: boolean;
  clogSlots: number;
  ehb: number;
  ehp: number;
  isMaxed: boolean;
  caTier: string;
}

const caTierToIcon = {
  Grandmaster: 'Tzkal slayer helmet'.replace(' ', '_'),
  Master: 'Vampyric slayer helmet'.replace(' ', '_'),
  Elite: 'Tztok slayer helmet'.replace(' ', '_'),
  Hard: "Ghommal's_hilt_3",
  Medium: "Ghommal's_hilt_2",
  Easy: "Ghommal's_hilt_1",
  Gnome: 'Gnome_child',
};

interface LeaderboardProps {
  initialPlayers: LeaderboardPlayer[];
}

function StatusIcon({
  hasStatus,
  trueIcon,
  falseIcon,
}: {
  hasStatus: boolean;
  trueIcon: string;
  falseIcon: string;
}) {
  return (
    <span
      style={{
        fontSize: '1.2em',
        color: hasStatus ? '#22c55e' : '#ef4444',
      }}
    >
      {hasStatus ? trueIcon : falseIcon}
    </span>
  );
}

export function Leaderboard({ initialPlayers }: LeaderboardProps) {
  const filteredInitialPlayers = initialPlayers.filter(
    (player) => player.rank && player.rank !== 'Unranked',
  );
  const [players, setPlayers] = useState<LeaderboardPlayer[]>(
    filteredInitialPlayers,
  );
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(initialPlayers.length === 50);
  const [offset, setOffset] = useState(50);

  const loadMore = async () => {
    if (loading) return;

    setLoading(true);
    try {
      const response = await fetch('/api/leaderboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          limit: 50,
          offset,
        }),
      });

      if (response.ok) {
        const data = (await response.json()) as {
          success: boolean;
          data: LeaderboardPlayer[];
        };
        if (data.success && data.data && data.data.length > 0) {
          const filteredNewPlayers = data.data.filter(
            (player: LeaderboardPlayer) =>
              player.rank && player.rank !== 'Unranked',
          );
          setPlayers((prev) => [...prev, ...filteredNewPlayers]);
          setOffset((prev) => prev + data.data.length);
          setHasMore(data.data.length === 50);
        } else {
          setHasMore(false);
        }
      } else {
        setHasMore(false);
      }
    } catch (error) {
      console.error('Failed to load more players:', error);
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  };

  if (players.length === 0) {
    return (
      <div
        style={{
          padding: '2rem',
          background: 'rgba(206, 147, 216, 0.1)',
          borderRadius: '12px',
          border: '1px solid rgba(206, 147, 216, 0.2)',
          color: 'rgba(255, 255, 255, 0.6)',
          textAlign: 'center',
        }}
      >
        No leaderboard data available
      </div>
    );
  }

  return (
    <div
      style={{
        background: 'rgba(206, 147, 216, 0.1)',
        borderRadius: '12px',
        border: '1px solid rgba(206, 147, 216, 0.2)',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div
        style={{
          background: 'rgba(26, 13, 46, 0.8)',
          padding: '1rem',
          borderBottom: '1px solid rgba(206, 147, 216, 0.2)',
          display: 'grid',
          gridTemplateColumns:
            '40px 100px 80px 80px 60px 60px 60px 60px 80px 80px 80px 80px 80px',
          gap: '1rem',
          alignItems: 'center',
          fontSize: '0.875rem',
          fontWeight: 600,
          color: '#ce93d8',
        }}
      >
        <div>#</div>
        <div>Player</div>
        <div>Points</div>
        <div>Rank</div>
        <div>
          <Image
            width={30}
            height={30}
            src={formatWikiImageUrl('Purifying_sigil')}
            alt="Radiant Oathplate Helmet"
          />
        </div>{' '}
        {/* Radiant */}
        <div>
          <Image
            width={30}
            height={30}
            src={formatWikiImageUrl('Ancient_blood_ornament_kit')}
            alt="Ancient Blood Ornament Kit"
          />
        </div>{' '}
        {/* Blorva */}
        <div>
          <Image
            width={30}
            height={30}
            src={formatWikiImageUrl('Infernal_cape')}
            alt="Infernal Cape"
          />
        </div>{' '}
        {/* Infernal */}
        <div>
          <Image
            width={30}
            height={30}
            src={formatWikiImageUrl("Blessed_dizana's_quiver")}
            alt="Blessed Dizana's Quiver"
          />
        </div>{' '}
        {/* Quiver */}
        <div>Clogs</div>
        <div>EHB</div>
        <div>EHP</div>
        <div>
          <Image
            width={20}
            height={20}
            src={formatWikiImageUrl('Max_cape', 'item')}
            alt="Max Cape"
          />
        </div>
        <div>CA Tier</div>
      </div>

      {/* Scrollable content */}
      <div
        style={{
          maxHeight: '400px',
          overflowY: 'auto',
          scrollbarWidth: 'thin',
          scrollbarColor: 'rgba(206, 147, 216, 0.5) transparent',
        }}
      >
        {players.map((player, index) => (
          <div
            key={`${player.playerName}-${index}`}
            style={{
              display: 'grid',
              gridTemplateColumns:
                '40px 100px 80px 80px 60px 60px 60px 60px 80px 80px 80px 80px 80px',
              gap: '1rem',
              alignItems: 'center',
              padding: '1rem',
              borderBottom:
                index < players.length - 1
                  ? '1px solid rgba(206, 147, 216, 0.1)'
                  : 'none',
              transition: 'background-color 0.2s',
              backgroundColor:
                index % 2 === 0 ? 'rgba(26, 13, 46, 0.3)' : 'transparent',
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.backgroundColor = 'rgba(26, 13, 46, 0.6)')
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.backgroundColor =
                index % 2 === 0 ? 'rgba(26, 13, 46, 0.3)' : 'transparent')
            }
          >
            <div style={{ color: '#e91e63', fontWeight: 'bold' }}>
              {index + 1}
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                color: 'white',
                fontWeight: 500,
              }}
            >
              <a
                href={`${clientConstants.temple.baseUrl}/player/overview.php?player=${player.playerName.toLowerCase()}`}
              >
                {player.playerName}
              </a>
            </div>
            <div
              style={{
                color: '#e91e63',
                fontWeight: 'bold',
                textAlign: 'center',
              }}
            >
              {player.points.toLocaleString()}
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem',
                fontSize: '0.875rem',
              }}
            >
              {player.rank ? (
                <Image
                  src={getRankImageUrl(player.rank as Rank)}
                  alt={`${getRankName(player.rank as Rank)} rank`}
                  width={16}
                  height={16}
                  style={{ borderRadius: '50%' }}
                />
              ) : (
                <Avatar
                  size="1"
                  fallback="?"
                  style={{ width: '16px', height: '16px' }}
                />
              )}
              <span style={{ color: '#ce93d8' }}>
                {player.rank ? getRankName(player.rank as Rank) : 'Unranked'}
              </span>
            </div>
            <StatusIcon
              hasStatus={player.hasRadiant}
              trueIcon="✅"
              falseIcon="❌"
            />
            <StatusIcon
              hasStatus={player.hasBlorva}
              trueIcon="✅"
              falseIcon="❌"
            />
            <StatusIcon
              hasStatus={player.hasInfernal}
              trueIcon="✅"
              falseIcon="❌"
            />
            <StatusIcon
              hasStatus={player.hasQuiver}
              trueIcon="✅"
              falseIcon="❌"
            />
            <div style={{ color: 'white', textAlign: 'center' }}>
              {player.clogSlots.toLocaleString()}
            </div>
            <div style={{ color: '#ce93d8', textAlign: 'center' }}>
              {Math.round(player.ehb).toLocaleString()}
            </div>
            <div style={{ color: '#ce93d8', textAlign: 'center' }}>
              {Math.round(player.ehp).toLocaleString()}
            </div>
            <StatusIcon
              hasStatus={player.isMaxed}
              trueIcon="✅"
              falseIcon="❌"
            />
            <div
              style={{
                color: '#e91e63',
                textAlign: 'center',
                fontSize: '0.875rem',
                fontWeight: 500,
              }}
            >
              <Image
                width={20}
                height={20}
                src={formatWikiImageUrl(
                  caTierToIcon[
                    player.caTier &&
                    caTierToIcon[player.caTier as keyof typeof caTierToIcon]
                      ? (player.caTier as keyof typeof caTierToIcon)
                      : 'Gnome'
                  ] || caTierToIcon.Gnome,
                )}
                alt="CaTier"
              />
            </div>
          </div>
        ))}

        {/* Load More Button */}
        {hasMore && (
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              padding: '1rem',
            }}
          >
            <button
              onClick={loadMore}
              disabled={loading}
              style={{
                background: loading
                  ? 'rgba(206, 147, 216, 0.3)'
                  : 'linear-gradient(135deg, #e91e63, #9c27b0)',
                color: 'white',
                border: 'none',
                padding: '0.75rem 1.5rem',
                borderRadius: '6px',
                fontSize: '0.875rem',
                fontWeight: 500,
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s',
              }}
            >
              {loading ? 'Loading...' : 'Load More'}
            </button>
          </div>
        )}
      </div>

      <style jsx>{`
        div::-webkit-scrollbar {
          width: 6px;
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
  );
}
