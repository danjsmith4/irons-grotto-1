import type { Metadata } from 'next';
import { NavBar } from '@/app/components/nav-bar';
import { fetchPlayerAccounts } from '@/app/rank-calculator/data-sources/fetch-player-accounts';
import { MaggotKingSpeedChaser } from './maggot-king-speed-chaser';
import styles from './maggot-king.module.css';

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
  const userCalculators = await fetchPlayerAccounts();

  return (
    <div className={styles.shell}>
      <NavBar currentPage="tools" userCalculators={userCalculators} />
      <main>
        <MaggotKingSpeedChaser />
      </main>
    </div>
  );
}
