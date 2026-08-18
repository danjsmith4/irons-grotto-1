'use client';

import { useEffect, useState } from 'react';
import { Dialog, VisuallyHidden } from '@radix-ui/themes';
import Image from 'next/image';
import { getRankImageUrl } from '@/app/rank-calculator/utils/get-rank-image-url';
import { getRankName } from '@/app/rank-calculator/utils/get-rank-name';
import { Rank } from '@/config/enums';
import { formatWikiImageUrl } from '../rank-calculator/utils/format-wiki-url';
import { formatXpInMillions } from '@/app/utils/format-number';
import { formatTimeAgo } from '@/app/utils/format-time-ago';
import { clientConstants } from '@/config/constants.client';
import { ItemImageWithFallback } from './item-image-with-fallback';
import type { PlayerProfile } from '../data-sources/fetch-player-profile';
import styles from './player-profile-modal.module.css';

interface PlayerProfileModalProps {
  playerName: string | null;
  onClose: () => void;
}

const DIARY_TIERS = ['Easy', 'Medium', 'Hard', 'Elite'];

const NOTABLES: {
  key: keyof PlayerProfile['notables'];
  label: string;
  src: string;
  type?: 'item' | 'category';
}[] = [
  { key: 'infernalCape', label: 'Infernal', src: 'Infernal_cape' },
  { key: 'bloodTorva', label: 'Blood Torva', src: 'Ancient_blood_ornament_kit' },
  { key: 'radiantOathplate', label: 'Radiant', src: 'Purifying_sigil' },
  { key: 'dizanasQuiver', label: 'Quiver', src: "Blessed_dizana's_quiver" },
  {
    key: 'achievementDiaryCape',
    label: 'Diary Cape',
    src: 'Achievement_diary_cape',
    type: 'item',
  },
  { key: 'maxCape', label: 'Max Cape', src: 'Max_cape', type: 'item' },
];

export function PlayerProfileModal({
  playerName,
  onClose,
}: PlayerProfileModalProps) {
  const [profile, setProfile] = useState<PlayerProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!playerName) return;

    let cancelled = false;
    setProfile(null);
    setError(null);
    setLoading(true);

    fetch(`/api/player-profile?name=${encodeURIComponent(playerName)}`)
      .then((r) => r.json())
      .then((res: { success: boolean; data?: PlayerProfile; error?: string }) => {
        if (cancelled) return;
        if (res.success && res.data) setProfile(res.data);
        else setError(res.error ?? 'Failed to load profile');
      })
      .catch((e) => !cancelled && setError(String(e)))
      .finally(() => !cancelled && setLoading(false));

    return () => {
      cancelled = true;
    };
  }, [playerName]);

  const progress =
    profile?.nextRankThreshold
      ? Math.max(
          0,
          Math.min(
            1,
            (profile.points - profile.currentRankThreshold) /
              (profile.nextRankThreshold - profile.currentRankThreshold),
          ),
        )
      : 1;

  const diaryByLocation = groupDiaries(profile?.diaries ?? []);

  return (
    <Dialog.Root
      open={!!playerName}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <Dialog.Content maxWidth="720px" className={styles.content}>
        {loading && <div className={styles.loading}>Loading profile…</div>}
        {error && <div className={styles.error}>{error}</div>}

        {profile && (
          <>
            <div className={styles.header}>
              <span className={styles.rankBadge}>
                <Image
                  src={getRankImageUrl(profile.rank as Rank)}
                  alt={getRankName(profile.rank as Rank)}
                  width={30}
                  height={30}
                  style={{ borderRadius: '50%' }}
                />
              </span>
              <div className={styles.headMain}>
                <Dialog.Title className={styles.name}>
                  {profile.playerName}
                </Dialog.Title>
                <div className={styles.rankLabel}>
                  {getRankName(profile.rank as Rank)}
                  {profile.isMaxed ? ' · Maxed' : ''}
                  {profile.isMobileOnly ? ' · Mobile' : ''}
                </div>
              </div>
              <div className={styles.pointsBox}>
                <div className={styles.pointsValue}>
                  {profile.points.toLocaleString()}
                </div>
                <div className={styles.pointsLabel}>Points</div>
              </div>
            </div>

            <VisuallyHidden>
              <Dialog.Description>
                Clan profile for {profile.playerName}
              </Dialog.Description>
            </VisuallyHidden>

            <div className={styles.progressWrap}>
              <div className={styles.progressMeta}>
                <span>
                  {profile.nextRank
                    ? `Progress to ${getRankName(profile.nextRank as Rank)}`
                    : 'Highest rank reached'}
                </span>
                {profile.nextRankThreshold && (
                  <span>
                    {Math.max(
                      0,
                      profile.nextRankThreshold - profile.points,
                    ).toLocaleString()}{' '}
                    to go
                  </span>
                )}
              </div>
              <div className={styles.progressTrack}>
                <div
                  className={styles.progressFill}
                  style={{ width: `${progress * 100}%` }}
                />
              </div>
            </div>

            {profile.hallOfFame.length > 0 && (
              <div className={styles.section}>
                <h3 className={styles.sectionTitle}>Hall of Fame</h3>
                <div className={styles.hofRow}>
                  {profile.hallOfFame.map((item) => (
                    <div key={item.itemId} className={styles.hof}>
                      <div className={styles.hofTile}>
                        <ItemImageWithFallback
                          itemId={item.itemId}
                          itemName={item.itemName}
                          size={40}
                        />
                      </div>
                      <span className={styles.hofName}>{item.itemName}</span>
                      <span className={styles.hofOwners}>
                        {item.owners === 1
                          ? 'Only owner'
                          : `${item.owners} own this`}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className={styles.section}>
              <div className={styles.statGrid}>
                <Stat label="EHB" value={Math.round(profile.ehb).toLocaleString()} />
                <Stat label="EHP" value={Math.round(profile.ehp).toLocaleString()} />
                <Stat
                  label="Total level"
                  value={profile.totalLevel.toLocaleString()}
                />
                <Stat
                  label="Total XP"
                  value={formatXpInMillions(profile.totalXp)}
                />
                <Stat label="CA tier" value={profile.combatAchievementTier} />
                <Stat label="Pets" value={profile.totalPets.toLocaleString()} />
                <Stat
                  label="Collection log"
                  value={`${profile.collectionLogCount.toLocaleString()} / ${profile.collectionLogTotal.toLocaleString()}`}
                />
                <Stat label="Joined" value={formatJoinDate(profile.joinDate)} />
              </div>
            </div>

            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>Notable items</h3>
              <div className={styles.badges}>
                {NOTABLES.map((n) => {
                  const owned = profile.notables[n.key];
                  return (
                    <span
                      key={n.key}
                      className={`${styles.badge} ${owned ? styles.badgeOwned : ''}`}
                    >
                      <Image
                        src={formatWikiImageUrl(n.src, n.type)}
                        alt={n.label}
                        width={20}
                        height={20}
                      />
                      {n.label}
                    </span>
                  );
                })}
              </div>
            </div>

            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>Clue scrolls</h3>
              <div className={styles.clueRow}>
                {(
                  [
                    ['Beginner', profile.clues.beginner],
                    ['Easy', profile.clues.easy],
                    ['Medium', profile.clues.medium],
                    ['Hard', profile.clues.hard],
                    ['Elite', profile.clues.elite],
                    ['Master', profile.clues.master],
                  ] as const
                ).map(([tier, count]) => (
                  <div key={tier} className={styles.clue}>
                    <div className={styles.clueTier}>{tier}</div>
                    <div className={styles.clueCount}>
                      {count.toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {diaryByLocation.length > 0 && (
              <div className={styles.section}>
                <h3 className={styles.sectionTitle}>Achievement diaries</h3>
                <div className={styles.diaryGrid}>
                  {diaryByLocation.map(({ location, tiers }) => (
                    <div key={location} className={styles.diaryRow}>
                      <span className={styles.diaryLoc}>{location}</span>
                      {DIARY_TIERS.map((tier) => (
                        <span
                          key={tier}
                          className={`${styles.diaryCell} ${
                            tiers[tier] ? styles.diaryDone : ''
                          }`}
                        >
                          {tier.slice(0, 1)}
                        </span>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {profile.rankUps.length > 0 && (
              <div className={styles.section}>
                <h3 className={styles.sectionTitle}>Rank history</h3>
                <div className={styles.timeline}>
                  {profile.rankUps.map((r, i) => (
                    <div key={i} className={styles.timelineRow}>
                      <span>
                        {r.oldRank
                          ? getRankName(r.oldRank as Rank)
                          : 'Unranked'}
                      </span>
                      <span className={styles.timelineArrow}>→</span>
                      <span className={styles.timelineRank}>
                        {getRankName(r.newRank as Rank)}
                      </span>
                      <span className={styles.timelineTime}>
                        {formatTimeAgo(new Date(r.createdAt))}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className={styles.footer}>
              <a
                className={styles.templeLink}
                href={`${clientConstants.temple.baseUrl}/player/overview.php?player=${profile.playerName.toLowerCase()}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                View on TempleOSRS ↗
              </a>
            </div>
          </>
        )}
      </Dialog.Content>
    </Dialog.Root>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className={styles.stat}>
      <span className={styles.statLabel}>{label}</span>
      <span className={styles.statValue}>{value}</span>
    </div>
  );
}

function groupDiaries(diaries: PlayerProfile['diaries']) {
  const map = new Map<string, Record<string, boolean>>();
  for (const d of diaries) {
    const tiers = map.get(d.location) ?? {};
    tiers[d.tier] = d.completed;
    map.set(d.location, tiers);
  }
  return [...map.entries()]
    .map(([location, tiers]) => ({ location, tiers }))
    .sort((a, b) => a.location.localeCompare(b.location));
}

function formatJoinDate(date: string) {
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return date;
  return d.toLocaleDateString('en', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}
