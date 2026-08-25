import { BaseSyntheticEvent } from 'react';
import { CalculatorHero } from '../components/calculator-hero';
import { ModerationStrip } from '../components/moderation-strip';
import { ItemList } from '../components/item-list';
import { CombatPanel } from '../components/panels/combat-panel';
import { SkillingPanel } from '../components/panels/skilling-panel';
import { CollectionLogAndCluesPanel } from '../components/panels/collection-log-and-clues-panel';
import { NotableItemsPanel } from '../components/panels/notable-items-panel';
import styles from '../components/rank-calculator.module.css';

interface RankCalculatorProps {
  submitRankCalculatorAction: ((e: BaseSyntheticEvent) => void) | undefined;
}

export function RankCalculator({
  submitRankCalculatorAction,
}: RankCalculatorProps) {
  return (
    <form onSubmit={submitRankCalculatorAction} className={styles.page}>
      <CalculatorHero />
      <ModerationStrip />
      <div className={styles.panelGrid}>
        <CombatPanel />
        <SkillingPanel />
        <CollectionLogAndCluesPanel />
        <NotableItemsPanel />
      </div>
      <ItemList />
    </form>
  );
}
