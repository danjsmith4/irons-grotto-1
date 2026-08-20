import Image from 'next/image';
import { useFormContext } from 'react-hook-form';
import { Text } from '@radix-ui/themes';
import { CombatAchievementTier, TzHaarCape } from '@/app/schemas/osrs';
import { customDiaryTierNameByBonusPoints } from '@/config/custom-diaries';
import { Panel, PanelField } from './panel';
import { Select } from '../select';
import { EditableText } from '../editable-text';
import { Checkbox } from '../checkbox';
import { ValidationTooltip } from '../validation-tooltip';
import { useCombatPointCalculator } from '../../hooks/point-calculator/combat/use-combat-point-calculator';
import { formatPercentage } from '../../utils/format-percentage';
import { getPointsRemainingLabel } from '../../utils/get-points-remaining-label';
import { formatNumber } from '../../utils/format-number';
import { RankCalculatorSchema } from '../../[player]/submit-rank-calculator-validation';

export function CombatPanel() {
  const {
    pointsAwarded,
    pointsAwardedPercentage,
    pointsRemaining,
    combatAchievementTierPoints,
    ehbPoints,
    tzhaarCapePoints,
    bloodTorvaPoints,
    dizanasQuiverPoints,
    radiantOathplatePoints,
    bonusPointsAwarded,
  } = useCombatPointCalculator();
  const {
    formState: { defaultValues, errors },
    getValues,
  } = useFormContext<RankCalculatorSchema>();
  const [hasBloodTorva, hasDizanasQuiver, hasRadiantOathplate] = getValues([
    'hasBloodTorva',
    'hasDizanasQuiver',
    'hasRadiantOathplate',
  ]);

  return (
    <Panel
      title="Combat"
      icon={
        <Image
          alt="Combat icon"
          src="/icons/combat.png"
          height={18}
          width={18}
          unoptimized
        />
      }
      total={formatNumber(pointsAwarded)}
      totalLabel="Total combat points"
      percentage={pointsAwardedPercentage}
      percentageText={formatPercentage(pointsAwardedPercentage)}
      percentageLabel="Combat point completion percentage"
      remaining={getPointsRemainingLabel(pointsRemaining)}
      remainingLabel="Combat points remaining"
    >
      <PanelField isHeader label="Category" points="Points" />
      <PanelField
        label="EHB"
        control={
          <EditableText
            aria-label="Efficient hours bossed value"
            name="ehb"
            type="number"
            required
            min={0}
            defaultValue={defaultValues?.ehb}
            readOnly
          />
        }
        points={
          <span aria-label="Efficient hours bossed points">
            {formatNumber(ehbPoints)}
          </span>
        }
      />
      <PanelField
        label="CA tier"
        control={
          <Select
            aria-label="Combat achievement tier value"
            name="combatAchievementTier"
            placeholder="Choose a tier"
            options={CombatAchievementTier.options}
          />
        }
        points={
          <span aria-label="Combat achievement tier points">
            {formatNumber(combatAchievementTierPoints)}
          </span>
        }
      />
      <PanelField
        label="TzHaar cape"
        control={
          <Select
            aria-label="TzHaar cape value"
            name="tzhaarCape"
            placeholder="Select a cape"
            options={TzHaarCape.options}
          />
        }
        points={
          <span aria-label="TzHaar cape points">
            {formatNumber(tzhaarCapePoints)}
          </span>
        }
      />
      <PanelField
        label={
          <ValidationTooltip error={errors.hasDizanasQuiver} size="2">
            <Text>Dizana&apos;s quiver</Text>
          </ValidationTooltip>
        }
        control={
          <Checkbox name="hasDizanasQuiver" checked={hasDizanasQuiver} />
        }
        points={
          <span aria-label="Dizana's quiver points">
            {formatNumber(dizanasQuiverPoints)}
          </span>
        }
      />
      <PanelField
        label={
          <ValidationTooltip error={errors.hasBloodTorva} size="2">
            <Text>Blood torva</Text>
          </ValidationTooltip>
        }
        control={<Checkbox name="hasBloodTorva" checked={hasBloodTorva} />}
        points={
          <span aria-label="Blood torva points">
            {formatNumber(bloodTorvaPoints)}
          </span>
        }
      />
      <PanelField
        label={
          <ValidationTooltip error={errors.hasRadiantOathplate} size="2">
            <Text>Radiant oathplate</Text>
          </ValidationTooltip>
        }
        control={
          <Checkbox
            name="hasRadiantOathplate"
            checked={hasRadiantOathplate}
          />
        }
        points={
          <span aria-label="Radiant oathplate points">
            {formatNumber(radiantOathplatePoints)}
          </span>
        }
      />
      <PanelField
        label="Speedrun diary tier"
        control={
          <span aria-label="Combat diary tier">
            {customDiaryTierNameByBonusPoints[bonusPointsAwarded] ?? 'None'}
          </span>
        }
        isBonus={!!bonusPointsAwarded}
        points={
          <span aria-label="Combat point bonus multiplier">
            {bonusPointsAwarded ? `+${formatNumber(bonusPointsAwarded)}` : '-'}
          </span>
        }
      />
    </Panel>
  );
}
