import { ClanStats as ClanStatsData } from '../data-sources/fetch-clan-stats';
import styles from './clan-stats.module.css';

interface ClanStatsProps {
  stats: ClanStatsData;
}

const compact = new Intl.NumberFormat('en', {
  notation: 'compact',
  maximumFractionDigits: 1,
});

const fmt = (n: number) => (n >= 10000 ? compact.format(n) : n.toLocaleString());

/**
 * "Grotto at a glance" — clan-wide aggregate KPIs in the data-desk style.
 */
export function ClanStats({ stats }: ClanStatsProps) {
  const cells: { label: string; value: string; accent?: boolean }[] = [
    { label: 'Members', value: fmt(stats.memberCount) },
    { label: 'Total points', value: fmt(stats.totalPoints) },
    { label: 'Clog slots', value: fmt(stats.totalClogSlots) },
    { label: 'Pets', value: fmt(stats.totalPets) },
    { label: 'Maxed', value: fmt(stats.maxedCount) },
    { label: 'Avg total level', value: fmt(stats.avgTotalLevel) },
    { label: 'Infernal capes', value: fmt(stats.infernalCount) },
    { label: 'Blood torvas', value: fmt(stats.bloodTorvaCount), accent: true },
  ];

  return (
    <div className={styles.grid}>
      {cells.map((cell) => (
        <div key={cell.label} className={styles.cell}>
          <span className={styles.label}>{cell.label}</span>
          <span
            className={`${styles.value} ${cell.accent ? styles.accent : ''}`}
          >
            {cell.value}
          </span>
        </div>
      ))}
    </div>
  );
}
