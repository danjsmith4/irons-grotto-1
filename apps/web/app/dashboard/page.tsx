import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { Cinzel, Inter } from 'next/font/google';
import { fetchRecentRankUps } from '@/app/data-sources/fetch-recent-rank-ups';
import { fetchRecentClogUpdates } from '@/app/data-sources/fetch-recent-clog-updates';
import { fetchPlayerAccounts } from '@/app/rank-calculator/data-sources/fetch-player-accounts';
import { fetchUserRecentClogs } from '@/app/data-sources/fetch-user-recent-clogs';
import { fetchLeaderboard } from '@/app/data-sources/fetch-leaderboard';
import { RecentRankUpsTable } from '@/app/components/recent-rank-ups-table';
import { RecentClogUpdatesTable } from '@/app/components/recent-clog-updates-table';
import { ClientRecentClogs } from '@/app/components/client-recent-clogs';
import { Leaderboard } from '@/app/components/leaderboard';
import { NavBar } from '@/app/components/nav-bar';

const cinzel = Cinzel({
  weight: ['400', '600', '700'],
  subsets: ['latin'],
});

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

  // Fetch user's calculators
  const userCalculators = await fetchPlayerAccounts();

  // Fetch user's recent collection log items
  const playerNames = Object.values(userCalculators).map(
    (player) => player.rsn,
  );
  const userRecentClogsResult = await fetchUserRecentClogs(playerNames, 20, 0);
  const userRecentClogs = userRecentClogsResult.success
    ? userRecentClogsResult.data
    : [];

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
          'radial-gradient(ellipse at center, #2d1b4e 0%, #1a0d2e 70%)',
        color: 'white',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <NavBar currentPage="dashboard" userCalculators={userCalculators} />

      {/* Animated rays background */}
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '100vw',
          height: '100vw',
          pointerEvents: 'none',
        }}
      >
        {Array.from({ length: 8 }, (_, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              width: '2px',
              height: '50vw',
              background:
                'linear-gradient(transparent 0%, rgba(233, 30, 99, 0.05) 40%, rgba(156, 39, 176, 0.08) 50%, rgba(233, 30, 99, 0.05) 60%, transparent 100%)',
              transformOrigin: 'bottom center',
              opacity: 0.4,
              transform: `translate(-50%, -100%) rotate(${i * 45}deg)`,
              animation: 'rotateRays 40s linear infinite',
            }}
          />
        ))}
      </div>

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
          {/* User's Recent Clogs */}
          {playerNames.length > 0 && (
            <div style={{ marginBottom: '3rem' }}>
              <div
                style={{
                  textAlign: 'center',
                  marginBottom: '1rem',
                }}
              >
                <h2
                  className={cinzel.className}
                  style={{
                    color: '#ce93d8',
                    fontSize: '1.5rem',
                    fontWeight: 600,
                    margin: 0,
                  }}
                >
                  Your Latest Collection Logs
                </h2>
              </div>
              <ClientRecentClogs
                initialItems={userRecentClogs}
                playerNames={playerNames}
              />
            </div>
          )}
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
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                marginBottom: '1.5rem',
                justifyContent: 'center',
              }}
            >
              <h2
                style={{
                  fontSize: '28px',
                  fontWeight: '700',
                  margin: 0,
                  background: 'linear-gradient(135deg, #e91e63, #9c27b0)',
                  backgroundClip: 'text',
                  WebkitBackgroundClip: 'text',
                  color: 'transparent',
                }}
              >
                🏆 Leaderboard
              </h2>
            </div>
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
              Recent member promotions and collection log updates
            </p>
          </div>

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
        </div>
      </div>
    </div>
  );
}
