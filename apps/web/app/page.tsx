import css from './homepage.module.css';
import { Inter } from 'next/font/google';
import Image from 'next/image';
import Link from 'next/link';
import { Button, Flex } from '@radix-ui/themes';

import { after } from 'next/server';
import { auth, signIn } from '@/auth';
import { redirect } from 'next/navigation';
import { maybeRunInactivitySync } from '@/lib/db/inactivity-sync';
import { fetchRecentRankUps } from './data-sources/fetch-recent-rank-ups';
import { fetchRecentClogUpdates } from './data-sources/fetch-recent-clog-updates';
import { fetchRecentAccomplishments } from './data-sources/fetch-recent-accomplishments';
import { fetchLeaderboard } from './data-sources/fetch-leaderboard';
import { fetchClanStats } from './data-sources/fetch-clan-stats';
import { fetchCollectionLogInsights } from './data-sources/fetch-collection-log-insights';
import { ClanStats } from './components/clan-stats';
import { RarestDrops } from './components/rarest-drops';
import { RecentRankUpsTable } from './components/recent-rank-ups-table';
import { RecentClogUpdatesTable } from './components/recent-clog-updates-table';
import { RecentAccomplishmentsTable } from './components/recent-accomplishments-table';
import { Leaderboard } from './components/leaderboard';
import { FadeInOnScroll } from './components/fade-in-on-scroll';

const inter = Inter({
  weight: ['300', '400', '500', '600'],
  subsets: ['latin'],
  display: 'swap',
});

export default async function HomePage() {
  // Kick off the daily inactivity reconcile (no server cron exists). Runs after
  // the response is sent and self-throttles to once per 24h, so it never blocks
  // or breaks the page.
  after(maybeRunInactivitySync);

  // Check auth on page load and redirect if authed
  const session = await auth();
  const dashboardUrl = '/dashboard';
  if (session) {
    redirect(dashboardUrl);
  }

  // Fetch recent rank ups and clog updates for clan at a glance
  const recentRankUpsResult = await fetchRecentRankUps();
  const recentRankUps = recentRankUpsResult.success
    ? recentRankUpsResult.data
    : [];

  const recentClogUpdatesResult = await fetchRecentClogUpdates();
  const recentClogUpdates = recentClogUpdatesResult.success
    ? recentClogUpdatesResult.data
    : [];

  const recentAccomplishmentsResult = await fetchRecentAccomplishments();
  const recentAccomplishments = recentAccomplishmentsResult.success
    ? (recentAccomplishmentsResult.data ?? [])
    : [];

  // Fetch leaderboard data (fetch more to account for unranked players being filtered)
  const leaderboardResult = await fetchLeaderboard(20, 0);
  const leaderboard = leaderboardResult.success ? leaderboardResult.data : [];

  const clanStatsResult = await fetchClanStats();
  const clanStats = clanStatsResult.success ? clanStatsResult.data : null;

  const clogInsightsResult = await fetchCollectionLogInsights();
  const clogInsights = clogInsightsResult.success
    ? clogInsightsResult.data
    : null;

  const handleSubmit = async () => {
    'use server';

    const session = await auth();
    const dashboardUrl = '/dashboard';

    if (!session) {
      await signIn('discord', { redirectTo: dashboardUrl });
    }

    redirect(dashboardUrl);
  };

  return (
    <div className={`${css['page-container']} ${inter.className}`}>
      {/* Sign-in button in top-right */}
      <Flex position="absolute" top="0" right="0" p="4" style={{ zIndex: 100 }}>
        <form action={handleSubmit}>
          <Button type="submit" variant="solid" size="3">
            Sign In
          </Button>
        </form>
      </Flex>

      {/* Main content */}
      <div className={css['main-content']}>
        {/* Logo section */}
        <div className={css['logo-section']}>
          <div className={css['logo-container']}>
            <Image
              src="/L1.png"
              alt="Irons Grotto Logo"
              width={160}
              height={160}
              className={css.logo}
              priority
            />
          </div>
          <h1 className={css['main-title']}>Irons Grotto</h1>
          <p className={css.subtitle}>
            A thriving Old School RuneScape community for Ironman accounts
          </p>

          {/* Leaders under logo */}
          <div
            style={{
              marginTop: '2rem',
              textAlign: 'center',
              color: 'rgb(var(--ig-text-muted))',
              fontSize: '14px',
            }}
          >
            <p style={{ margin: '0.3rem 0' }}>Owner: Aceriwyn</p>
            <p style={{ margin: '0.3rem 0' }}>
              Deputies: Dead Player, Hoagie, ciaran258, Avios, Gods, Rewind
            </p>
          </div>
        </div>

        {/* Action buttons */}
        <div className={css['action-buttons']}>
          <form action={handleSubmit}>
            <button
              type="submit"
              className={`${css.button} ${css['primary-button']}`}
            >
              Apply for Rank
            </button>
          </form>
          <a
            href="https://discord.gg/sUT4Xx9zag"
            target="_blank"
            className={`${css.button} ${css['secondary-button']}`}
          >
            Join Discord
          </a>
          <Link
            href="/bingo"
            className={`${css.button} ${css['secondary-button']}`}
          >
            Bingo Events
          </Link>
        </div>

        {/* What's happening in Grotto section with fade-in */}
        <div
          style={{
            width: '100%',
            maxWidth: '1200px',
            margin: '4rem 0 2rem 0',
            zIndex: 2,
            textAlign: 'center',
          }}
        >
          <div style={{ marginBottom: '2rem' }}>
            <h2
              style={{
                fontFamily: 'var(--font-display), ui-sans-serif, system-ui',
                fontWeight: 600,
                color: 'rgb(var(--ig-text))',
                fontSize: '1.8rem',
                letterSpacing: '-0.01em',
                marginBottom: '0.5rem',
              }}
            >
              What&apos;s happening in Grotto
            </h2>
          </div>

          <FadeInOnScroll>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '3rem',
                alignItems: 'center',
              }}
            >
              {/* Clan at a glance */}
              {clanStats && (
                <div style={{ width: '100%', maxWidth: '1250px' }}>
                  <ClanStats stats={clanStats} />
                </div>
              )}

              {/* Leaderboard */}
              <div
                style={{
                  width: '100%',
                  maxWidth: '1250px',
                }}
              >
                <Leaderboard initialPlayers={leaderboard} />
              </div>

              {/* Accomplishments — the headline feed, full width above the
                  narrower rank-up and collection-log columns.

                  Hidden entirely until there is something to show. Unlike the
                  other two feeds this one starts empty by design: a player's
                  first detection pass is recorded as backfill and kept out of
                  the feed, so an empty-state card would sit on the homepage
                  for weeks after launch announcing that nothing has happened.
                  Guarded here rather than inside the component because the
                  parent is a flex column with a gap — an element that renders
                  nothing still leaves a hole. */}
              {recentAccomplishments.length > 0 && (
                <div style={{ width: '100%', maxWidth: '1250px' }}>
                  <RecentAccomplishmentsTable
                    accomplishments={recentAccomplishments}
                  />
                </div>
              )}

              {/* Recent activity tables */}
              <div
                style={{
                  display: 'flex',
                  gap: '2rem',
                  flexDirection: 'row',
                  justifyContent: 'center',
                  flexWrap: 'wrap',
                  width: '100%',
                }}
              >
                <div
                  style={{
                    flex: '1 1 400px',
                    minWidth: '400px',
                    maxWidth: '500px',
                  }}
                >
                  <RecentRankUpsTable rankUps={recentRankUps ?? []} />
                </div>
                <div
                  style={{
                    flex: '1 1 400px',
                    minWidth: '400px',
                    maxWidth: '500px',
                  }}
                >
                  <RecentClogUpdatesTable
                    clogUpdates={recentClogUpdates ?? []}
                  />
                </div>
              </div>

              {/* Rarest collection-log items across the clan */}
              {clogInsights && (
                <div style={{ width: '100%', maxWidth: '1250px' }}>
                  <RarestDrops insights={clogInsights} />
                </div>
              )}
            </div>
          </FadeInOnScroll>
        </div>
      </div>
    </div>
  );
}
