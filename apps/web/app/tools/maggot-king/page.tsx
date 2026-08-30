import type { Metadata } from 'next';
import { NavBar } from '@/app/components/nav-bar';
import { fetchSessionContext } from '@/app/data-sources/fetch-session-context';
import { MaggotKingSpeedChaser } from './maggot-king-speed-chaser';
import styles from './maggot-king.module.css';

/*
 * The page's content is static, but its nav bar is not: it names the viewer's
 * accounts and now carries their staff role, both of which come from the
 * session. Saying so up front stops Next attempting a static render and
 * logging the bailout as a failed staff-role read at build time.
 */
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Maggot King Speed Chaser | Irons Grotto',
  description:
    'Plan the Maggot King Speed Chaser combat achievement: log each kill time and see what the remaining kills have to average to land inside nine minutes.',
};

/**
 * Tools are open to anyone — nothing here reads a player record, so there is no
 * reason to put it behind the Discord gate the calculator needs. Signing in
 * only changes what the nav bar's Accounts menu has to offer.
 */
export default async function MaggotKingToolPage() {
  const { accounts: userCalculators, ...viewer } = await fetchSessionContext();

  return (
    <div className={styles.shell}>
      <NavBar
        currentPage="tools"
        userCalculators={userCalculators}
        viewerStaffRole={viewer.staffRole}
        events={viewer.events}
      />
      <main>
        <MaggotKingSpeedChaser />
      </main>
    </div>
  );
}
