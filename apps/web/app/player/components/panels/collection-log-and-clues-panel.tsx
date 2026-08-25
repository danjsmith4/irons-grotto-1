import Image from 'next/image';
import { useFormContext } from 'react-hook-form';
import { ClueScrollTier } from '@/app/schemas/osrs';
import { clogDiaryTierNameByBonusPoints } from '@/config/custom-diaries';
import { Panel, PanelField } from './panel';
import { EditableText } from '../editable-text';
import { useCollectionLogAndCluesPointCalculator } from '../../hooks/point-calculator/collection-log-and-clues/use-collection-log-and-clues-point-calculator';
import { formatPercentage } from '../../utils/format-percentage';
import { getPointsRemainingLabel } from '../../utils/get-points-remaining-label';
import { formatNumber } from '../../utils/format-number';
import { RankCalculatorSchema } from '../../[player]/submit-rank-calculator-validation';

export function CollectionLogAndCluesPanel() {
  const {
    pointsAwarded,
    pointsAwardedPercentage,
    pointsRemaining,
    collectionLogSlotPoints,
    clueScrollTierPoints,
    collectionLogBonusPoints,
  } = useCollectionLogAndCluesPointCalculator();
  const {
    getValues,
    formState: { defaultValues },
  } = useFormContext<RankCalculatorSchema>();
  const collectionLogTotal = getValues('collectionLogTotal');

  return (
    <Panel
      title="Collection log & clues"
      icon={
        <Image
          alt="Collection log icon"
          src="/icons/collection-log.png"
          height={17}
          width={18}
          unoptimized
        />
      }
      total={formatNumber(pointsAwarded)}
      totalLabel="Total collection log points"
      percentage={pointsAwardedPercentage}
      percentageText={formatPercentage(pointsAwardedPercentage)}
      percentageLabel="Collection log point completion percentage"
      remaining={getPointsRemainingLabel(pointsRemaining)}
      remainingLabel="Collection log points remaining"
    >
      <PanelField isHeader label="Category" points="Points" />
      <PanelField
        label="Collection log slots"
        control={
          <EditableText
            aria-label="Collection log count"
            name="collectionLogCount"
            type="number"
            required
            min={0}
            max={collectionLogTotal}
            defaultValue={defaultValues?.collectionLogCount}
            readOnly
          />
        }
        points={
          <span aria-label="Collection log slot points">
            {formatNumber(collectionLogSlotPoints)}
          </span>
        }
      />
      {ClueScrollTier.options.map((tier) => (
        <PanelField
          key={tier}
          label={`${tier} clues`}
          control={
            <EditableText
              aria-label={`${tier} clue count`}
              name={`clueScrollCounts.${tier}`}
              type="number"
              required
              min={0}
              defaultValue={defaultValues?.clueScrollCounts?.[tier]}
              readOnly
            />
          }
          points={
            <span aria-label={`${tier} clue scroll points`}>
              {formatNumber(clueScrollTierPoints[tier])}
            </span>
          }
        />
      ))}
      <PanelField
        label="Clog diary tier"
        control={
          <span aria-label="Clog diary tier">
            {clogDiaryTierNameByBonusPoints[collectionLogBonusPoints] ?? 'None'}
          </span>
        }
        isBonus={!!collectionLogBonusPoints}
        points={
          <span aria-label="Clog diary tier points">
            {collectionLogBonusPoints
              ? `+${formatNumber(collectionLogBonusPoints)}`
              : '-'}
          </span>
        }
      />
    </Panel>
  );
}
