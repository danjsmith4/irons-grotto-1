'use client';

import { useMemo, useState } from 'react';
import { Avatar } from '@radix-ui/themes';
import {
  TriangleUpIcon,
  TriangleDownIcon,
  CaretSortIcon,
  BarChartIcon,
  MagnifyingGlassIcon,
} from '@radix-ui/react-icons';
import Image from 'next/image';
import { getRankImageUrl } from '@/app/rank-calculator/utils/get-rank-image-url';
import { getRankName } from '@/app/rank-calculator/utils/get-rank-name';
import { Rank } from '@/config/enums';
import { formatWikiImageUrl } from '../rank-calculator/utils/format-wiki-url';
import { formatXpInMillions } from '@/app/utils/format-number';
import { SectionHeader } from './section-header';
import { usePlayerProfile } from './player-profile-context';
import styles from './leaderboard.module.css';

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

type SortField =
  | 'points'
  | 'clogSlots'
  | 'totalPets'
  | 'ehb'
  | 'ehp'
  | 'totalXp';
type SortDirection = 'asc' | 'desc';

interface SortState {
  field: SortField;
  direction: SortDirection;
}

interface LeaderboardProps {
  initialPlayers: LeaderboardPlayer[];
}

// Achievement columns rendered as present (wiki icon) / absent (muted dash).
const itemColumns: {
  key:
    | 'hasRadiant'
    | 'hasBlorva'
    | 'hasInfernal'
    | 'hasQuiver'
    | 'hasFangKit';
  src: string;
  alt: string;
  title: string;
}[] = [
  {
    key: 'hasRadiant',
    src: 'Purifying_sigil',
    alt: 'Radiant',
    title: 'Radiant Oathplate',
  },
  {
    key: 'hasBlorva',
    src: 'Ancient_blood_ornament_kit',
    alt: 'Blorva',
    title: 'Blood Torva',
  },
  {
    key: 'hasInfernal',
    src: 'Infernal_cape',
    alt: 'Infernal',
    title: 'Infernal Cape',
  },
  {
    key: 'hasQuiver',
    src: "Blessed_dizana's_quiver",
    alt: 'Quiver',
    title: "Blessed Dizana's Quiver",
  },
  {
    key: 'hasFangKit',
    src: 'Cursed_phalanx',
    alt: 'Fang Kit',
    title: 'Cursed Phalanx (Fang Kit)',
  },
];

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
    direction: 'desc',
  });
  const [search, setSearch] = useState('');
  const { openProfile } = usePlayerProfile();

  const sortPlayers = (field: SortField) => {
    const newDirection =
      sortState.field === field && sortState.direction === 'desc'
        ? 'asc'
        : 'desc';

    const sorted = [...players].sort((a, b) => {
      const aValue = a[field];
      const bValue = b[field];
      return newDirection === 'desc' ? bValue - aValue : aValue - bValue;
    });

    setPlayers(sorted);
    setSortState({ field, direction: newDirection });
  };

  // Point-based rank is fixed regardless of the current sort column, and must
  // cover every loaded player (not just the initial page) so rows fetched via
  // "Load more" get a real number instead of 00.
  const pointRankByName = useMemo(() => {
    const map = new Map<string, number>();
    [...players]
      .sort((a, b) => b.points - a.points)
      .forEach((player, i) => map.set(player.playerName, i + 1));
    return map;
  }, [players]);

  const loadMore = async () => {
    if (loading) return;

    setLoading(true);
    try {
      const response = await fetch('/api/leaderboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ limit: 50, offset }),
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

          const sorted = newPlayers.sort((a, b) => {
            const aValue = a[sortState.field];
            const bValue = b[sortState.field];
            return sortState.direction === 'desc'
              ? bValue - aValue
              : aValue - bValue;
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

  const visiblePlayers = search
    ? players.filter((p) =>
        p.playerName.toLowerCase().includes(search.toLowerCase()),
      )
    : players;

  // Infinite scroll: pull the next page as the user nears the bottom of the
  // scroll container (no "load more" button).
  const handleScroll = (event: React.UIEvent<HTMLDivElement>) => {
    if (!hasMore || loading || search) return;
    const el = event.currentTarget;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 240) {
      void loadMore();
    }
  };

  const SortHeader = ({
    field,
    label,
  }: {
    field: SortField;
    label: string;
  }) => {
    const active = sortState.field === field;
    return (
      <th
        className={`${styles.sortable} ${active ? styles.sortActive : ''}`}
        onClick={() => sortPlayers(field)}
      >
        {label}
        {active ? (
          sortState.direction === 'desc' ? (
            <TriangleDownIcon className={styles.sortIcon} />
          ) : (
            <TriangleUpIcon className={styles.sortIcon} />
          )
        ) : (
          <CaretSortIcon className={`${styles.sortIcon} ${styles.sortIconIdle}`} />
        )}
      </th>
    );
  };

  const ItemHead = ({ src, alt, title }: { src: string; alt: string; title: string }) => (
    <th className={styles.thCenter}>
      <span className={styles.iconHead}>
        <Image
          width={22}
          height={22}
          src={formatWikiImageUrl(src)}
          alt={alt}
          title={title}
        />
      </span>
    </th>
  );

  const header = (
    <SectionHeader
      title="Leaderboard"
      subtitle={`${filteredInitialPlayers.length} ranked members`}
      icon={<BarChartIcon width={18} height={18} />}
      actions={
        <label className={styles.search}>
          <MagnifyingGlassIcon width={15} height={15} />
          <input
            type="text"
            placeholder="Search player"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search player"
          />
        </label>
      }
    />
  );

  if (players.length === 0) {
    return (
      <div>
        {header}
        <div className={styles.empty}>No leaderboard data available</div>
      </div>
    );
  }

  return (
    <div>
      {header}
      <div className={styles.container}>
        <div className={styles.scroll} onScroll={handleScroll}>
          <table className={styles.table}>
            <thead className={styles.thead}>
              <tr>
                <th className={styles.thLeft}>#</th>
                <th className={styles.thLeft}>Player</th>
                <SortHeader field="points" label="Points" />
                <th className={styles.thLeft}>Rank</th>
                {itemColumns.map((c) => (
                  <ItemHead key={c.key} src={c.src} alt={c.alt} title={c.title} />
                ))}
                <SortHeader field="clogSlots" label="Clogs" />
                <SortHeader field="totalPets" label="Pets" />
                <SortHeader field="ehb" label="EHB" />
                <SortHeader field="ehp" label="EHP" />
                <SortHeader field="totalXp" label="Total XP" />
                <th className={styles.thCenter}>
                  <span className={styles.iconHead}>
                    <Image
                      width={20}
                      height={20}
                      src={formatWikiImageUrl('Max_cape', 'item')}
                      alt="Maxed"
                      title="Max Cape"
                    />
                  </span>
                </th>
                <th className={styles.thCenter}>CA</th>
              </tr>
            </thead>

            <tbody>
              {visiblePlayers.map((player, index) => {
                const pointRank =
                  pointRankByName.get(player.playerName) ?? index + 1;
                const rankClass =
                  pointRank === 1
                    ? styles.rank1
                    : pointRank === 2
                      ? styles.rank2
                      : pointRank === 3
                        ? styles.rank3
                        : '';
                return (
                  <tr key={`${player.playerName}-${index}`} className={styles.row}>
                    <td className={`${styles.td} ${styles.rank} ${rankClass}`}>
                      {String(pointRank).padStart(2, '0')}
                    </td>

                    <td className={`${styles.td} ${styles.tdLeft}`}>
                      <button
                        type="button"
                        className={styles.player}
                        onClick={() => openProfile(player.playerName)}
                      >
                        {player.playerName}
                      </button>
                    </td>

                    <td className={`${styles.td} ${styles.num}`}>
                      {player.points.toLocaleString()}
                    </td>

                    <td className={`${styles.td} ${styles.tdLeft}`}>
                      <span className={styles.roleCell}>
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
                        <span className={styles.roleName}>
                          {player.rank
                            ? getRankName(player.rank as Rank)
                            : 'Unranked'}
                        </span>
                      </span>
                    </td>

                    {itemColumns.map((c) => (
                      <td
                        key={c.key}
                        className={`${styles.td} ${styles.tdCenter} ${styles.itemCell}`}
                      >
                        {player[c.key] ? (
                          <Image
                            className={styles.itemImg}
                            width={26}
                            height={26}
                            src={formatWikiImageUrl(c.src)}
                            alt={c.alt}
                            title={c.title}
                          />
                        ) : (
                          <span className={styles.absent}>&mdash;</span>
                        )}
                      </td>
                    ))}

                    <td className={`${styles.td} ${styles.num}`}>
                      {player.clogSlots.toLocaleString()}
                    </td>
                    <td className={`${styles.td} ${styles.num}`}>
                      {player.totalPets.toLocaleString()}
                    </td>
                    <td className={`${styles.td} ${styles.num}`}>
                      {Math.round(player.ehb).toLocaleString()}
                    </td>
                    <td className={`${styles.td} ${styles.num}`}>
                      {Math.round(player.ehp).toLocaleString()}
                    </td>
                    <td className={`${styles.td} ${styles.num}`}>
                      {formatXpInMillions(player.totalXp)}
                    </td>

                    <td className={`${styles.td} ${styles.tdCenter} ${styles.itemCell}`}>
                      {player.isMaxed ? (
                        <Image
                          className={styles.itemImg}
                          width={20}
                          height={20}
                          src={formatWikiImageUrl('Max_cape', 'item')}
                          alt="Maxed"
                          title="Max Cape"
                        />
                      ) : (
                        <span className={styles.absent}>&mdash;</span>
                      )}
                    </td>

                    <td className={`${styles.td} ${styles.tdCenter} ${styles.itemCell}`}>
                      <Image
                        className={styles.itemImg}
                        width={26}
                        height={26}
                        src={formatWikiImageUrl(
                          caTierToIcon[
                            player.caTier &&
                            caTierToIcon[
                              player.caTier as keyof typeof caTierToIcon
                            ]
                              ? (player.caTier as keyof typeof caTierToIcon)
                              : 'Gnome'
                          ] || caTierToIcon.Gnome,
                        )}
                        alt={player.caTier || 'Gnome'}
                        title={`${player.caTier || 'Gnome'} Combat Achievement Tier`}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {loading && (
            <div className={styles.loadingRow}>Loading more…</div>
          )}
        </div>
      </div>
    </div>
  );
}
