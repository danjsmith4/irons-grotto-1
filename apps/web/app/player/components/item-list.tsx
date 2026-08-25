'use client';

import { useState } from 'react';
import { useFormContext } from 'react-hook-form';
import { BackpackIcon, MagnifyingGlassIcon } from '@radix-ui/react-icons';
import { SectionHeader } from '@/app/components/section-header';
import { Category } from './category';
import { useGetItems } from '../hooks/use-get-items';
import { useNotableItemsPointCalculator } from '../hooks/point-calculator/notable-items/use-notable-items-point-calculator';
import { useTotalPoints } from '../hooks/point-calculator/use-total-points';
import { RankCalculatorSchema } from '../[player]/submit-rank-calculator-validation';
import { stripEntityName } from '../utils/strip-entity-name';
import { formatNumber } from '../utils/format-number';
import { disableEnterSubmission } from '../utils/disable-enter-submission';
import styles from './rank-calculator.module.css';

/**
 * The workbench: every notable item, grouped by the content that drops it,
 * with a sticky search toolbar. Full width — the page itself scrolls.
 */
export function ItemList() {
  const [query, setQuery] = useState('');
  const { data: categories } = useGetItems();
  const { itemsCollected, totalItems } = useNotableItemsPointCalculator();
  const pointsAwarded = useTotalPoints();
  const { getFieldState } = useFormContext<RankCalculatorSchema>();

  const visibleCategories = categories.filter(([title, category]) => {
    const queryLower = query.toLowerCase();

    return (
      title.toLowerCase().includes(queryLower) ||
      category.items.some(({ name }) =>
        name.toLowerCase().includes(queryLower),
      )
    );
  });

  return (
    <section className={styles.workbench}>
      <div className={styles.toolbar}>
        <SectionHeader
          title="Notable items"
          subtitle={`${formatNumber(itemsCollected)} / ${formatNumber(
            totalItems,
          )} collected${
            query ? ` · ${visibleCategories.length} matching categories` : ''
          }`}
          icon={<BackpackIcon width={18} height={18} />}
          actions={
            <div className={styles.toolbarActions}>
              {/* Keeps the score in view while ticking items off. */}
              <div className={styles.toolbarTotal}>
                <span
                  className={styles.toolbarTotalValue}
                  aria-label="Running total"
                >
                  {formatNumber(pointsAwarded)}
                </span>
                <span className={styles.metaLabel}>pts</span>
              </div>
              <label className={styles.search}>
                <MagnifyingGlassIcon width={15} height={15} />
                <input
                  type="text"
                  aria-label="Search notable items"
                  placeholder="Search items or bosses…"
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                  }}
                  // The page is one big <form>; Enter must not submit it.
                  onKeyDown={disableEnterSubmission}
                />
              </label>
            </div>
          }
        />
      </div>

      {visibleCategories.length > 0 ? (
        visibleCategories.map(([title, category]) => {
          const fieldErrors = category.items.map(
            ({ name }) =>
              getFieldState(`acquiredItems.${stripEntityName(name)}`).error,
          );

          return (
            <Category
              key={title}
              items={category.items}
              title={title}
              image={category.image}
              errors={fieldErrors}
              query={query}
            />
          );
        })
      ) : (
        <p className={styles.empty}>No items match “{query}”</p>
      )}
    </section>
  );
}
