import { useWatch } from 'react-hook-form';
import { CommonPointCalculatorData } from '@/app/schemas/rank-calculator';
import { RankCalculatorSchema } from '@/app/player/[player]/submit-rank-calculator-validation';
import { calculateNotableItemsPoints } from '@/app/player/utils/calculators/calculate-notable-items-points';
import { useCalculatorScaling } from '../use-calculator-scaling';
import { useGetItems } from '../../use-get-items';

export interface NotableItemsPointCalculatorData
  extends CommonPointCalculatorData {
  percentageCollected: number;
  itemsCollected: number;
  totalItems: number;
}

export function useNotableItemsPointCalculator() {
  const itemFields = useWatch<RankCalculatorSchema, 'acquiredItems'>({
    name: 'acquiredItems',
  });
  const notableItemsBonusPoints = useWatch<
    RankCalculatorSchema,
    'notableItemsBonusPoints'
  >({
    name: 'notableItemsBonusPoints',
  });
  const scaling = useCalculatorScaling();
  const { data: notableItems } = useGetItems();

  return calculateNotableItemsPoints(
    notableItems,
    itemFields,
    notableItemsBonusPoints,
    scaling,
  );
}
