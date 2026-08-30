import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { NavBar } from '@/app/components/nav-bar';
import { fetchPlayerAccounts } from '@/app/player/data-sources/fetch-player-accounts';
import { fetchAdminDashboard } from '@/app/data-sources/fetch-admin-dashboard';
import { fetchDiscordBans } from '@/app/data-sources/fetch-discord-bans';
import { fetchClanEvents } from '@/app/data-sources/fetch-clan-events';
import { fetchNavContext } from '@/app/data-sources/fetch-nav-context';
import { AdminPanes } from './admin-panes';
import styles from './admin.module.css';

export const metadata = {
  title: 'Administration — Irons Grotto',
};

/**
 * The clan's administration page.
 *
 * Elevated accounts only — admin, deputy owner and owner. A member who is not
 * one is sent back to the dashboard rather than shown an error, because the
 * page's existence is not something they need to know about.
 */
export default async function AdminPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/');
  }

  // All three are gated on the same elevated check, so they can go out
  // together; only the roster decides whether the page renders at all. The ban
  // list talks to Discord and the events pane talks to TempleOSRS — both are
  // allowed to fail on their own, and render the failure in their own pane.
  const [result, bansResult, eventsResult] = await Promise.all([
    fetchAdminDashboard(),
    fetchDiscordBans(),
    fetchClanEvents(),
  ]);

  if (!result.success) {
    redirect('/dashboard');
  }

  const { viewerRole, viewerPlayerName, members, history, belowTotalLevel } =
    result.data;
  const [userCalculators, navContext] = await Promise.all([
    fetchPlayerAccounts(),
    fetchNavContext(),
  ]);

  return (
    <div className={styles.page}>
      <NavBar
        currentPage="admin"
        userCalculators={userCalculators}
        {...navContext}
      />
      <main className={styles.main}>
        <AdminPanes
          viewerRole={viewerRole}
          viewerPlayerName={viewerPlayerName}
          members={members}
          history={history}
          bans={bansResult.success ? bansResult.data.bans : null}
          bansError={bansResult.success ? null : bansResult.error}
          events={eventsResult.success ? eventsResult.data : null}
          eventsError={eventsResult.success ? null : eventsResult.error}
          belowTotalLevel={belowTotalLevel}
        />
      </main>
    </div>
  );
}
