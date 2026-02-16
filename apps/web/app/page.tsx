import css from './homepage.module.css';
import { Cinzel, Inter } from 'next/font/google';
import Image from 'next/image';
import Link from 'next/link';
import { Button, Flex } from '@radix-ui/themes';

import { auth, signIn } from '@/auth';
import { redirect } from 'next/navigation';
import { fetchRecentRankUps } from './data-sources/fetch-recent-rank-ups';
import { fetchRecentClogUpdates } from './data-sources/fetch-recent-clog-updates';
import { fetchLeaderboard } from './data-sources/fetch-leaderboard';
import { RecentRankUpsTable } from './components/recent-rank-ups-table';
import { RecentClogUpdatesTable } from './components/recent-clog-updates-table';
import { Leaderboard } from './components/leaderboard';
import { FadeInOnScroll } from './components/fade-in-on-scroll';

const cinzel = Cinzel({
  weight: ['400', '600', '700'],
  subsets: ['latin'],
});

const inter = Inter({
  weight: ['300', '400', '500', '600'],
  subsets: ['latin'],
  display: 'swap',
});

export default async function HomePage() {
  // Check auth on page load and redirect if authed
  const session = await auth();
  const dashboardUrl = '/rank-calculator/dashboard';
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

  // Fetch leaderboard data (fetch more to account for unranked players being filtered)
  const leaderboardResult = await fetchLeaderboard(20, 0);
  const leaderboard = leaderboardResult.success ? leaderboardResult.data : [];

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

      {/* Animated rays background */}
      <div className={css['rays-container']}>
        {Array.from({ length: 12 }, (_, i) => (
          <div key={i} className={`${css.ray} ${css[`ray-${i + 1}`]}`} />
        ))}
      </div>

      {/* Main content */}
      <div className={css['main-content']}>
        {/* Logo section */}
        <div className={css['logo-section']}>
          <div className={css['logo-container']}>
            <Image
              src="/L2.png"
              alt="Irons Grotto Logo"
              width={160}
              height={160}
              className={css.logo}
              priority
            />
            <div className={css['logo-glow']} />
          </div>
          <h1 className={`${css['main-title']} ${cinzel.className}`}>
            Irons Grotto
          </h1>
          <p className={css.subtitle}>
            A thriving Old School RuneScape community for Ironman accounts
          </p>

          {/* Leaders under logo */}
          <div
            style={{
              marginTop: '2rem',
              textAlign: 'center',
              color: 'rgba(255, 255, 255, 0.7)',
              fontSize: '14px',
            }}
          >
            <p style={{ margin: '0.3rem 0' }}>Owners: Avios & Tyluh</p>
            <p style={{ margin: '0.3rem 0' }}>
              Deputies: Claytonaa, Aceriwyn, Dead Player, The Victory
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
              className={`${cinzel.className}`}
              style={{
                color: '#ce93d8',
                fontSize: '1.8rem',
                marginBottom: '0.5rem',
              }}
            >
              What's happening in Grotto...
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
              {/* Leaderboard */}
              <div
                style={{
                  width: '100%',
                  maxWidth: '900px',
                }}
              >
                <div style={{ marginBottom: '1.5rem', textAlign: 'center' }}>
                  <h3
                    className={`${cinzel.className}`}
                    style={{
                      color: '#ce93d8',
                      fontSize: '1.5rem',
                      marginBottom: '0.5rem',
                    }}
                  >
                    Top Players
                  </h3>
                  <p
                    style={{
                      color: 'rgba(255, 255, 255, 0.7)',
                      fontSize: '14px',
                      margin: 0,
                    }}
                  >
                    Our highest achieving clan members
                  </p>
                </div>
                <Leaderboard initialPlayers={leaderboard} />
              </div>

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
            </div>
          </FadeInOnScroll>
        </div>
      </div>
    </div>
  );
}
