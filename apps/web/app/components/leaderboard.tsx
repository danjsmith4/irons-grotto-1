'use client';

import { useState } from 'react';
import { Avatar, Table, ScrollArea } from '@radix-ui/themes';
import { HamburgerMenuIcon } from '@radix-ui/react-icons';
import Image from 'next/image';
import { getRankImageUrl } from '@/app/rank-calculator/utils/get-rank-image-url';
import { getRankName } from '@/app/rank-calculator/utils/get-rank-name';
import { Rank } from '@/config/enums';
import { formatWikiImageUrl } from '../rank-calculator/utils/format-wiki-url';
import { clientConstants } from '@/config/constants.client';
import { formatXpInMillions } from '@/app/utils/format-number';

export interface LeaderboardPlayer {
  playerName: string;
  rank: string | null;
  points: number;
  hasRadiant: boolean;
  hasBlorva: boolean;
  hasInfernal: boolean;
  hasQuiver: boolean;
  hasFangKit: boolean;
  clogSlots: number;
  ehb: number;
  ehp: number;
  totalXp: number;
  totalPets: number;
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

type SortField = 'points' | 'clogSlots' | 'totalPets' | 'ehb' | 'ehp' | 'totalXp';
type SortDirection = 'asc' | 'desc';

interface SortState {
  field: SortField;
  direction: SortDirection;
}

interface LeaderboardProps {
  initialPlayers: LeaderboardPlayer[];
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
  const [sortState, setSortState] = useState<SortState>({
    field: 'points',
    direction: 'desc'
  });

  const sortPlayers = (field: SortField) => {
    const newDirection = sortState.field === field && sortState.direction === 'desc' ? 'asc' : 'desc';
    
    const sorted = [...players].sort((a, b) => {
      const aValue = a[field];
      const bValue = b[field];
      
      if (newDirection === 'desc') {
        return bValue - aValue;
      } else {
        return aValue - bValue;
      }
    });
    
    setPlayers(sorted);
    setSortState({ field, direction: newDirection });
  };

  const getSortIcon = (field: SortField) => {
    return <HamburgerMenuIcon style={{ width: 14, height: 14, display: 'inline-block', marginLeft: 4, opacity: 0.7 }} />;
  };

  // Create a mapping of players to their point-based rank
  const getPointRank = (playerName: string) => {
    const sortedByPoints = [...filteredInitialPlayers].sort((a, b) => b.points - a.points);
    return sortedByPoints.findIndex(p => p.playerName === playerName) + 1;
  };

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
          const newPlayers = [...players, ...filteredNewPlayers];
          
          // Re-apply current sort to new combined data
          const sorted = newPlayers.sort((a, b) => {
            const aValue = a[sortState.field];
            const bValue = b[sortState.field];
            
            if (sortState.direction === 'desc') {
              return bValue - aValue;
            } else {
              return aValue - bValue;
            }
          });
          
          setPlayers(sorted);
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
    <ScrollArea
      style={{
        width: '100%',
        height: '500px',
        background: 'rgba(206, 147, 216, 0.1)',
        borderRadius: '12px',
        border: '1px solid rgba(206, 147, 216, 0.2)',
      }}
    >
      <Table.Root>
        <Table.Header style={{ position: 'sticky', top: 0, zIndex: 1 }}>
          <Table.Row style={{ background: 'rgba(26, 13, 46, 0.95)' }}>
            <Table.ColumnHeaderCell>#</Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell>Player</Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell 
              style={{ cursor: 'pointer', userSelect: 'none' }}
              onClick={() => sortPlayers('points')}
            >
              Points{getSortIcon('points')}
            </Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell>Rank</Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell>
              <Image
                width={30}
                height={30}
                src={formatWikiImageUrl('Purifying_sigil')}
                alt="Radiant"
                title="Radiant Oathplate"
              />
            </Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell>
              <Image
                width={30}
                height={30}
                src={formatWikiImageUrl('Ancient_blood_ornament_kit')}
                alt="Blorva"
                title="Blood Torva"
              />
            </Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell>
              <Image
                width={30}
                height={30}
                src={formatWikiImageUrl('Infernal_cape')}
                alt="Infernal"
                title="Infernal Cape"
              />
            </Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell>
              <Image
                width={30}
                height={30}
                src={formatWikiImageUrl("Blessed_dizana's_quiver")}
                alt="Quiver"
                title="Blessed Dizana's Quiver"
              />
            </Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell>
              <Image
                width={30}
                height={30}
                src={formatWikiImageUrl('Cursed_phalanx')}
                alt="Fang Kit"
                title="Cursed Phalanx (Fang Kit)"
              />
            </Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell
              style={{ cursor: 'pointer', userSelect: 'none' }}
              onClick={() => sortPlayers('clogSlots')}
            >
              Clogs{getSortIcon('clogSlots')}
            </Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell
              style={{ cursor: 'pointer', userSelect: 'none' }}
              onClick={() => sortPlayers('totalPets')}
            >
              Pets{getSortIcon('totalPets')}
            </Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell
              style={{ cursor: 'pointer', userSelect: 'none' }}
              onClick={() => sortPlayers('ehb')}
            >
              EHB{getSortIcon('ehb')}
            </Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell
              style={{ cursor: 'pointer', userSelect: 'none' }}
              onClick={() => sortPlayers('ehp')}
            >
              EHP{getSortIcon('ehp')}
            </Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell
              style={{ cursor: 'pointer', userSelect: 'none' }}
              onClick={() => sortPlayers('totalXp')}
            >
              Total XP{getSortIcon('totalXp')}
            </Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell>
              <Image
                width={20}
                height={20}
                src={formatWikiImageUrl('Max_cape', 'item')}
                alt="Maxed"
                title="Max Cape"
              />
            </Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell>CA Tier</Table.ColumnHeaderCell>
          </Table.Row>
        </Table.Header>

        <Table.Body>
          {players.map((player, index) => {
            const pointRank = getPointRank(player.playerName);
            return (
              <Table.Row
                key={`${player.playerName}-${index}`}
                style={{
                  backgroundColor:
                    index % 2 === 0 ? 'rgba(26, 13, 46, 0.2)' : 'transparent',
                }}
              >
                <Table.RowHeaderCell
                  style={{
                    color:
                      pointRank === 1
                        ? '#FFD700'
                        : pointRank === 2
                          ? '#C0C0C0'
                          : pointRank === 3
                            ? '#CD7F32'
                            : '#e91e63',
                    fontWeight: 'bold'
                  }}
                >
                  {pointRank}
                </Table.RowHeaderCell>

              <Table.Cell>
                <a
                  href={`${clientConstants.temple.baseUrl}/player/overview.php?player=${player.playerName.toLowerCase()}`}
                  style={{
                    color: '#ce93d8',
                    textDecoration: 'none',
                    fontWeight: 500,
                    fontSize: 16,
                  }}
                >
                  {player.playerName}
                </a>
              </Table.Cell>

              <Table.Cell
                style={{
                  color: '#white',
                  fontWeight: 'bold',
                  textAlign: 'center',
                }}
              >
                {player.points.toLocaleString()}
              </Table.Cell>

              <Table.Cell>
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
                    {player.rank
                      ? getRankName(player.rank as Rank)
                      : 'Unranked'}
                  </span>
                </div>
              </Table.Cell>

              <Table.Cell style={{ textAlign: 'center' }}>
                {player.hasRadiant ? (
                  <Image
                    width={30}
                    height={30}
                    src={formatWikiImageUrl('Purifying_sigil')}
                    alt="Radiant"
                    title="Radiant Oathplate"
                  />
                ) : (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      height: '35px',
                    }}
                  >
                    ❌
                  </div>
                )}
              </Table.Cell>

              <Table.Cell style={{ textAlign: 'center' }}>
                {player.hasBlorva ? (
                  <Image
                    width={30}
                    height={30}
                    src={formatWikiImageUrl('Ancient_blood_ornament_kit')}
                    alt="Blorva"
                    title="Blood Torva"
                  />
                ) : (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      height: '35px',
                    }}
                  >
                    ❌
                  </div>
                )}
              </Table.Cell>

              <Table.Cell style={{ textAlign: 'center' }}>
                {player.hasInfernal ? (
                  <Image
                    width={30}
                    height={30}
                    src={formatWikiImageUrl('Infernal_cape')}
                    alt="Infernal"
                    title="Infernal Cape"
                  />
                ) : (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      height: '35px',
                    }}
                  >
                    ❌
                  </div>
                )}
              </Table.Cell>

              <Table.Cell style={{ textAlign: 'center' }}>
                {player.hasQuiver ? (
                  <Image
                    width={30}
                    height={30}
                    src={formatWikiImageUrl("Blessed_dizana's_quiver")}
                    alt="Quiver"
                    title="Blessed Dizana's Quiver"
                  />
                ) : (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      height: '35px',
                    }}
                  >
                    ❌
                  </div>
                )}
              </Table.Cell>

              <Table.Cell style={{ textAlign: 'center' }}>
                {player.hasFangKit ? (
                  <Image
                    width={30}
                    height={30}
                    src={formatWikiImageUrl('Cursed_phalanx')}
                    alt="Fang Kit"
                    title="Cursed Phalanx (Fang Kit)"
                  />
                ) : (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      height: '35px',
                    }}
                  >
                    ❌
                  </div>
                )}
              </Table.Cell>

              <Table.Cell style={{ color: '#ce93d8', textAlign: 'center' }}>
                {player.clogSlots.toLocaleString()}
              </Table.Cell>

              <Table.Cell style={{ color: '#ce93d8', textAlign: 'center' }}>
                {player.totalPets.toLocaleString()}
              </Table.Cell>

              <Table.Cell style={{ color: '#ce93d8', textAlign: 'center' }}>
                {Math.round(player.ehb).toLocaleString()}
              </Table.Cell>

              <Table.Cell style={{ color: '#ce93d8', textAlign: 'center' }}>
                {Math.round(player.ehp).toLocaleString()}
              </Table.Cell>

              <Table.Cell style={{ color: '#ce93d8', textAlign: 'center' }}>
                {formatXpInMillions(player.totalXp)}
              </Table.Cell>

              <Table.Cell style={{ textAlign: 'center' }}>
                {player.isMaxed ? (
                  <Image
                    width={20}
                    height={20}
                    src={formatWikiImageUrl('Max_cape', 'item')}
                    alt="Maxed"
                    title="Max Cape"
                  />
                ) : (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      height: '20px',
                    }}
                  >
                    ❌
                  </div>
                )}
              </Table.Cell>

              <Table.Cell style={{ textAlign: 'center' }}>
                <Image
                  width={30}
                  height={30}
                  src={formatWikiImageUrl(
                    caTierToIcon[
                      player.caTier &&
                      caTierToIcon[player.caTier as keyof typeof caTierToIcon]
                        ? (player.caTier as keyof typeof caTierToIcon)
                        : 'Gnome'
                    ] || caTierToIcon.Gnome,
                  )}
                  alt={player.caTier || 'Gnome'}
                  title={`${player.caTier || 'Gnome'} Combat Achievement Tier`}
                />
              </Table.Cell>
            </Table.Row>
          );
        })}
        </Table.Body>
      </Table.Root>

      {/* Load More Button */}
      {hasMore && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            padding: '1rem',
            background: 'rgba(206, 147, 216, 0.1)',
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
    </ScrollArea>
  );
}
