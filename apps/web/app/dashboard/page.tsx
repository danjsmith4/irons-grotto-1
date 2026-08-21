import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { Inter } from 'next/font/google';
import { fetchRecentRankUps } from '@/app/data-sources/fetch-recent-rank-ups';
import { fetchRecentClogUpdates } from '@/app/data-sources/fetch-recent-clog-updates';
import { fetchRecentAccomplishments } from '@/app/data-sources/fetch-recent-accomplishments';
import { fetchPlayerAccounts } from '@/app/rank-calculator/data-sources/fetch-player-accounts';
import { fetchLeaderboard } from '@/app/data-sources/fetch-leaderboard';
import { RecentRankUpsTable } from '@/app/components/recent-rank-ups-table';
import { RecentClogUpdatesTable } from '@/app/components/recent-clog-updates-table';
import { RecentAccomplishmentsTable } from '@/app/components/recent-accomplishments-table';
import { Leaderboard } from '@/app/components/leaderboard';
import { NavBar } from '@/app/components/nav-bar';

const inter = Inter({
  weight: ['300', '400', '500', '600'],
  subsets: ['latin'],
  display: 'swap',
});

export default async function DashboardPage() {
  // Check auth - redirect to login if not authenticated
  const session = await auth();
  if (!session?.user?.id) {
    redirect('/');
  }

  // Fetch recent rank ups and clog updates
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

  // Fetch user's calculators
  const userCalculators = await fetchPlayerAccounts();

  // Fetch leaderboard data
  const leaderboardResult = await fetchLeaderboard(50, 0);
  const leaderboardPlayers = leaderboardResult.success
    ? leaderboardResult.data
    : [];

  return (
    <div
      className={inter.className}
      style={{
        minHeight: '100vh',
        background:
          'radial-gradient(ellipse at center, rgb(var(--ig-surface-2)) 0%, rgb(var(--ig-bg)) 70%)',
        color: 'white',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <NavBar currentPage="dashboard" userCalculators={userCalculators} />

      {/* Main content */}
      <div
        style={{
          position: 'relative',
          zIndex: 2,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '2rem',
          maxWidth: '1400px',
          margin: '0 auto',
          padding: '2rem',
        }}
      >
        {/* What's happening section */}
        <div
          style={{
            width: '100%',
            maxWidth: '1200px',
          }}
        >
          {/* "Your Latest Collection Logs" used to sit here. Removed on member
              feedback: it showed you your own recent clog items, which is
              exactly what the collection log in game already does. The
              components and their API route are kept — nothing about them is
              wrong, there is just no reason to render them here. */}

          {/* Leaderboard section */}
          <div
            style={{
              marginTop: '1.5rem',
              width: '100%',
              marginBottom: '1.5rem',
            }}
          >
            <div
              style={{
                maxWidth: '1200px',
                margin: '0 auto',
              }}
            >
              <Leaderboard initialPlayers={leaderboardPlayers} />
            </div>
          </div>

          <div
            style={{
              textAlign: 'center',
              marginBottom: '2rem',
            }}
          >
            <p
              style={{
                color: 'rgba(255, 255, 255, 0.7)',
                fontSize: '14px',
                margin: 0,
              }}
            >
              {recentAccomplishments.length > 0
                ? 'Recent accomplishments, member promotions and collection log updates'
                : 'Recent member promotions and collection log updates'}
            </p>
          </div>

          {/* The three activity feeds, side by side on a wide screen. See the
              note on the homepage — same grid, same reasoning. */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
              gap: '2rem',
              width: '100%',
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
        </div>
      </div>
    </div>
  );
}
