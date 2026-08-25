import { memo } from 'react';
import { FieldError } from 'react-hook-form';
import { isCollectionLogItem, Item } from '@/app/schemas/items';
import { Checkbox } from './checkbox';
import { stripEntityName } from '../utils/strip-entity-name';
import { EntityImage } from './entity-image';
import { useCalculatorScaling } from '../hooks/point-calculator/use-calculator-scaling';
import { ValidationTooltip } from './validation-tooltip';
import styles from './rank-calculator.module.css';

interface ItemProps {
  acquired: boolean;
  item: Item;
  error: FieldError | undefined;
}

export const MemoisedItem = memo(({ item, acquired, error }: ItemProps) => {
  const scaling = useCalculatorScaling();
  const scaledItemPoints = Intl.NumberFormat('en-gb').format(
    Math.max(1, Math.floor(item.points * scaling)),
  );
  const pointsError =
    isCollectionLogItem(item) && item.hasPointsError
      ? ({
          type: 'value',
          message: 'Could not determine item points',
        } satisfies FieldError)
      : undefined;

  return (
    <div className={`${styles.item} ${acquired ? styles.itemAcquired : ''}`}>
      <span className={styles.itemIcon}>
        <EntityImage alt={`${item.name} icon`} src={item.image} fallback="?" />
      </span>
      <ValidationTooltip error={pointsError ?? error}>
        <span className={styles.itemName}>{item.name}</span>
      </ValidationTooltip>
      <Checkbox
        checked={acquired}
        disabled={!!(error ?? pointsError)}
        name={`acquiredItems.${stripEntityName(item.name)}` as const}
      />
      <span
        aria-label={`${item.name} points`}
        className={`${styles.itemPoints} ${
          pointsError ? styles.itemError : ''
        }`}
      >
        {pointsError ? '-' : scaledItemPoints}
      </span>
    </div>
  );
});

MemoisedItem.displayName = 'MemoisedItem';
