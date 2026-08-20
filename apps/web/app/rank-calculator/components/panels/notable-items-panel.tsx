import Image from 'next/image';
import { Panel, PanelField } from './panel';
import { useNotableItemsPointCalculator } from '../../hooks/point-calculator/notable-items/use-notable-items-point-calculator';
import { formatPercentage } from '../../utils/format-percentage';
import { getPointsRemainingLabel } from '../../utils/get-points-remaining-label';
import { formatNumber } from '../../utils/format-number';

export function NotableItemsPanel() {
  const {
    pointsAwarded,
    pointsAwardedPercentage,
    pointsRemaining,
    percentageCollected,
    itemsCollected,
    totalItems,
  } = useNotableItemsPointCalculator();

  return (
    <Panel
      title="Notable items"
      icon={
        <Image
          alt="Inventory icon"
          src="/icons/inventory.png"
          height={18}
          width={18}
          unoptimized
        />
      }
      total={formatNumber(pointsAwarded)}
      totalLabel="Total notable items points"
      percentage={pointsAwardedPercentage}
      percentageText={formatPercentage(pointsAwardedPercentage)}
      percentageLabel="Notable items point completion percentage"
      remaining={getPointsRemainingLabel(pointsRemaining)}
      remainingLabel="Notable items points remaining"
    >
      <PanelField isHeader label="Category" points="Value" />
      <PanelField
        label="Items collected"
        points={
          <span aria-label="Notable items collected">
            {formatNumber(itemsCollected)}
          </span>
        }
      />
      <PanelField
        label="Total items available"
        points={
          <span aria-label="Total notable items available">
            {formatNumber(totalItems)}
          </span>
        }
      />
      <PanelField
        label="Percentage collected"
        points={
          <span aria-label="Notable items collected percentage">
            {formatPercentage(percentageCollected)}
          </span>
        }
      />
    </Panel>
  );
}
