import css from './homepage.module.css';
import { Inter } from 'next/font/google';
import Image from 'next/image';
import Link from 'next/link';
import { Button, Flex } from '@radix-ui/themes';

import { after } from 'next/server';
import { auth, signIn } from '@/auth';
import { redirect } from 'next/navigation';
import { maybeRunInactivitySync } from '@/lib/db/inactivity-sync';
import { clientConstants } from '@/config/constants.client';
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
import { ClanEventHighlight } from './components/clan-event-highlight';
import { fetchPublicClanEventFacts } from './data-sources/fetch-public-clan-event';

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

  // One query, no TempleOSRS — the entrant count is filled in client-side so a
  // slow third party can never hold up the landing page.
  const clanEventResult = await fetchPublicClanEventFacts();
  const clanEvents = clanEventResult.success
    ? clanEventResult.data
    : { active: null, next: null };

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
            <p style={{ margin: '0.3rem 0' }}>Owners: Avios, Aceriwyn</p>
            <p style={{ margin: '0.3rem 0' }}>
              Deputies: Dead Player, Hoagie, ciaran258, Gods, Rewind, vivibtw
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
            href={clientConstants.discord.inviteUrl}
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

        {/* The running competition, directly under the hero. This is the only
            page with no nav bar — and signed-in visitors are redirected away
            from it — so it is the one place the event indicator never reached
            the audience it is most useful to. Renders nothing between events. */}
        <ClanEventHighlight events={clanEvents} />

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

              {/* The three activity feeds, side by side on a wide screen.
                  auto-fit collapses them to two, then one, without any
                  breakpoint arithmetic — and `align-items: stretch` (the grid
                  default) keeps the cards the same height, which the fixed
                  `max-height` on `.list` already assumes.

                  Accomplishments is conditional: with nothing to show it would
                  otherwise leave an empty grid cell, and a column of whitespace
                  reads worse than two columns. */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
                  gap: '2rem',
                  width: '100%',
                  maxWidth: '1250px',
                }}
              >
                <RecentRankUpsTable rankUps={recentRankUps ?? []} />
                {recentAccomplishments.length > 0 && (
                  <RecentAccomplishmentsTable
                    accomplishments={recentAccomplishments}
                  />
                )}
                <RecentClogUpdatesTable clogUpdates={recentClogUpdates ?? []} />
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
