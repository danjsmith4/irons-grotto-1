import { ItemCategoryMap } from '@/app/schemas/items';
import { fortisColosseum } from './item-categories/fortis-colosseum';
import { yama } from './item-categories/yama';

export const itemList: ItemCategoryMap = {
  'Fortis Colosseum': fortisColosseum,
  Yama: yama,
} satisfies ItemCategoryMap;
