import Image from 'next/image';
import { useFormContext } from 'react-hook-form';
import { Text } from '@radix-ui/themes';
import {
  DiaryLocation,
  DiaryTier,
  maximumTotalLevel,
  minimumTotalLevel,
} from '@/app/schemas/osrs';
import { Panel, PanelField } from './panel';
import { Select } from '../select';
import { EditableText } from '../editable-text';
import { Checkbox } from '../checkbox';
import { ValidationTooltip } from '../validation-tooltip';
import { useSkillingPointCalculator } from '../../hooks/point-calculator/skilling/use-skilling-point-calculator';
import { formatPercentage } from '../../utils/format-percentage';
import { getPointsRemainingLabel } from '../../utils/get-points-remaining-label';
import { formatNumber } from '../../utils/format-number';
import { RankCalculatorSchema } from '../../[player]/submit-rank-calculator-validation';
import { isAchievementDiaryCapeAchieved } from '../../utils/is-achievement-diary-cape-achieved';

export function SkillingPanel() {
  const {
    pointsAwarded,
    pointsAwardedPercentage,
    pointsRemaining,
    totalLevelPoints,
    achievementDiariesPoints,
    ehpPoints,
    achievementDiaryCapePoints,
  } = useSkillingPointCalculator();
  const {
    formState: { defaultValues, errors },
    getValues,
    setValue,
  } = useFormContext<RankCalculatorSchema>();
  const hasAchievementDiaryCape = getValues('hasAchievementDiaryCape');

  return (
    <Panel
      title="Skilling"
      icon={
        <Image
          alt="Skills icon"
          src="/icons/skills.png"
          height={18}
          width={18}
          unoptimized
        />
      }
      total={formatNumber(pointsAwarded)}
      totalLabel="Total skilling points"
      percentage={pointsAwardedPercentage}
      percentageText={formatPercentage(pointsAwardedPercentage)}
      percentageLabel="Skilling point completion percentage"
      remaining={getPointsRemainingLabel(pointsRemaining)}
      remainingLabel="Skilling points remaining"
    >
      <PanelField isHeader label="Category" points="Points" />
      <PanelField
        label="EHP"
        control={
          <EditableText
            aria-label="Efficient hours played value"
            name="ehp"
            required
            type="number"
            min={0}
            defaultValue={defaultValues?.ehp}
            readOnly
          />
        }
        points={
          <span aria-label="Efficient hours played points">
            {formatNumber(ehpPoints)}
          </span>
        }
      />
      <PanelField
        label="Total level"
        control={
          <EditableText
            aria-label="Total level value"
            name="totalLevel"
            required
            type="number"
            min={minimumTotalLevel}
            max={maximumTotalLevel}
            defaultValue={defaultValues?.totalLevel}
            readOnly
          />
        }
        points={
          <span aria-label="Total level points">
            {formatNumber(totalLevelPoints)}
          </span>
        }
      />
      {DiaryLocation.options.map((location) => (
        <PanelField
          key={location}
          label={location}
          control={
            <Select<RankCalculatorSchema>
              aria-label={`${location} diary value`}
              name={`achievementDiaries.${location}`}
              placeholder="Choose a tier"
              options={DiaryTier.options}
              onValueChange={() => {
                const achievementDiaries = getValues('achievementDiaries');

                setValue(
                  'hasAchievementDiaryCape',
                  isAchievementDiaryCapeAchieved(achievementDiaries),
                );
              }}
            />
          }
          points={
            <span aria-label={`${location} diary points`}>
              {formatNumber(achievementDiariesPoints[location])}
            </span>
          }
        />
      ))}
      <PanelField
        label={
          <ValidationTooltip error={errors.hasAchievementDiaryCape} size="2">
            <Text>Diary cape</Text>
          </ValidationTooltip>
        }
        control={
          <Checkbox
            name="hasAchievementDiaryCape"
            checked={hasAchievementDiaryCape}
            disabled
          />
        }
        points={
          <span aria-label="Achievement diary cape points">
            {formatNumber(achievementDiaryCapePoints)}
          </span>
        }
      />
    </Panel>
  );
}
