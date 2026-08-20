import { memo, useEffect, useId, useState } from 'react';
import { FieldError, useWatch } from 'react-hook-form';
import { ChevronDownIcon } from '@radix-ui/react-icons';
import { Item } from '@/app/schemas/items';
import { formatWikiImageUrl } from '../utils/format-wiki-url';
import { MemoisedItem } from './item';
import { stripEntityName } from '../utils/strip-entity-name';
import { EntityImage } from './entity-image';
import { parseInitials } from '../utils/parse-initials';
import { formatPercentage } from '../utils/format-percentage';
import { RankCalculatorSchema } from '../[player]/submit-rank-calculator-validation';
import styles from './rank-calculator.module.css';

interface CategoryProps {
  title: string;
  image?: string;
  items: Item[];
  errors: (FieldError | undefined)[];
  query?: string;
}

export const Category = memo(
  ({
    title,
    items,
    image = formatWikiImageUrl(title, 'category'),
    errors,
    query,
  }: CategoryProps) => {
    const [isOpen, setIsOpen] = useState(true);
    const bodyId = useId();
    const itemNames = items.map(({ name }) => stripEntityName(name));
    const fieldsArray = useWatch<
      RankCalculatorSchema,
      `acquiredItems.${string}`[]
    >({
      name: itemNames.map((name) => `acquiredItems.${name}` as const),
    });
    const fields: Record<string, boolean> = {};
    itemNames.forEach((name, idx) => {
      fields[name] = !!fieldsArray[idx];
    });
    const errorsMap: Record<string, FieldError | undefined> = {};
    itemNames.forEach((name, idx) => {
      errorsMap[name] = errors[idx];
    });
    const completedCount = Object.values(fields).filter(Boolean).length;
    const completion = completedCount / items.length;
    const percentComplete = formatPercentage(completion, 0);
    const queryLower = query?.toLowerCase() ?? '';
    const isSearching = queryLower.length > 0;

    const matchesCategory = title.toLowerCase().includes(queryLower);
    const visibleItems = items.filter(
      (item) => matchesCategory || item.name.toLowerCase().includes(queryLower),
    );

    // A search should always reveal what it matched, even in a collapsed
    // category.
    useEffect(() => {
      if (isSearching) {
        setIsOpen(true);
      }
    }, [isSearching]);

    if (!matchesCategory && visibleItems.length === 0) {
      return null;
    }

    return (
      <section className={styles.category}>
        <button
          type="button"
          className={styles.categoryHeader}
          aria-expanded={isOpen}
          aria-controls={bodyId}
          onClick={() => {
            setIsOpen((open) => !open);
          }}
        >
          <EntityImage
            alt={`${title} icon`}
            src={image}
            size="2"
            height={32}
            width={32}
            fallback={parseInitials(title)}
          />
          <span className={styles.categoryIdentity}>
            <span className={styles.categoryTitle}>{title}</span>
            <span
              aria-label={`${title} item count`}
              className={styles.categoryCount}
            >
              {`${completedCount} / ${items.length}`}
            </span>
          </span>
          <span className={styles.categoryMeter}>
            <span
              className={styles.categoryMeterFill}
              style={{ width: `${completion * 100}%` }}
            />
          </span>
          <span
            aria-label={`${title} percentage complete`}
            className={`${styles.categoryPercent} ${
              completion >= 1 ? styles.categoryComplete : ''
            }`}
          >
            {percentComplete}
          </span>
          <ChevronDownIcon
            aria-hidden
            className={`${styles.panelChevron} ${
              isOpen ? styles.panelChevronOpen : ''
            }`}
          />
        </button>
        <div id={bodyId} hidden={!isOpen}>
          {isOpen && (
            <div className={styles.itemGrid}>
              {visibleItems.map((item) => {
                const nameKey = stripEntityName(item.name);

                return (
                  <MemoisedItem
                    key={item.name}
                    acquired={!!fields[nameKey]}
                    item={item}
                    error={errorsMap[nameKey]}
                  />
                );
              })}
            </div>
          )}
        </div>
      </section>
    );
  },
);

Category.displayName = 'Category';
