import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { NavBar } from '@/app/components/nav-bar';
import { fetchPlayerAccounts } from '@/app/rank-calculator/data-sources/fetch-player-accounts';
import { fetchAdminDashboard } from '@/app/data-sources/fetch-admin-dashboard';
import { StaffRoles } from './staff-roles';
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

  const result = await fetchAdminDashboard();

  if (!result.success) {
    redirect('/dashboard');
  }

  const { viewerRole, viewerPlayerName, members, history } = result.data;
  const userCalculators = await fetchPlayerAccounts();

  return (
    <div className={styles.page}>
      <NavBar currentPage="admin" userCalculators={userCalculators} />
      <main className={styles.main}>
        <StaffRoles
          viewerRole={viewerRole}
          viewerPlayerName={viewerPlayerName}
          members={members}
          history={history}
        />
      </main>
    </div>
  );
}
