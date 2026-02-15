import css from './homepage.module.css';
import { Cinzel, Inter } from 'next/font/google';
import Image from 'next/image';
import Link from 'next/link';

import { auth, signIn } from '@/auth';
import { redirect } from 'next/navigation';
import { fetchRecentRankUps } from './data-sources/fetch-recent-rank-ups';
import { fetchRecentClogUpdates } from './data-sources/fetch-recent-clog-updates';
import { RecentRankUpsTable } from './components/recent-rank-ups-table';
import { RecentClogUpdatesTable } from './components/recent-clog-updates-table';
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
  const rankCalculatorUrl = '/rank-calculator';
  if (session) {
    redirect(rankCalculatorUrl);
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

  const handleSubmit = async () => {
    'use server';

    const session = await auth();
    const rankCalculatorUrl = '/rank-calculator';

    if (!session) {
      await signIn('discord', { redirectTo: rankCalculatorUrl });
    }

    redirect(rankCalculatorUrl);
  };

  return (
    <div className={`${css['page-container']} ${inter.className}`}>
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
              What's happening in Grotto
            </h2>
            <p
              style={{
                color: 'rgba(255, 255, 255, 0.7)',
                fontSize: '14px',
                margin: 0,
              }}
            >
              Scroll to see what the Grotto is up to...
            </p>
          </div>

          <FadeInOnScroll>
            <div
              style={{
                display: 'flex',
                gap: '2rem',
                flexDirection: 'row',
                justifyContent: 'center',
                flexWrap: 'wrap',
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
                <RecentClogUpdatesTable clogUpdates={recentClogUpdates ?? []} />
              </div>
            </div>
          </FadeInOnScroll>
        </div>
      </div>
    </div>
  );
}
