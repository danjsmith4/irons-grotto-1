import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { NavBar } from '@/app/components/nav-bar';
import { fetchPlayerAccounts } from '@/app/player/data-sources/fetch-player-accounts';
import { fetchAdminDashboard } from '@/app/data-sources/fetch-admin-dashboard';
import { fetchDiscordBans } from '@/app/data-sources/fetch-discord-bans';
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

  // Both are gated on the same elevated check, so they can go out together;
  // only the roster decides whether the page renders at all. The ban list
  // talks to Discord and is allowed to fail on its own — see the data source.
  const [result, bansResult] = await Promise.all([
    fetchAdminDashboard(),
    fetchDiscordBans(),
  ]);

  if (!result.success) {
    redirect('/dashboard');
  }

  const { viewerRole, viewerPlayerName, members, history } = result.data;
  const userCalculators = await fetchPlayerAccounts();

  return (
    <div className={styles.page}>
      <NavBar currentPage="admin" userCalculators={userCalculators} />
      <main className={styles.main}>
        <AdminPanes
          viewerRole={viewerRole}
          viewerPlayerName={viewerPlayerName}
          members={members}
          history={history}
          bans={bansResult.success ? bansResult.data.bans : null}
          bansError={bansResult.success ? null : bansResult.error}
        />
      </main>
    </div>
  );
}
