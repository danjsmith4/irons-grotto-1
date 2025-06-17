import { formatWikiImageUrl } from '@/app/rank-calculator/utils/format-wiki-url';
import { ItemCategory } from '@/app/schemas/items';
import { manualItem } from '../utils/item-builders';

export const yama: ItemCategory = {
  image: formatWikiImageUrl('Yami chathead', 'category'),
  items: [
    manualItem({
      name: 'Radiant oathplate armour',
      image: formatWikiImageUrl('Radiant oathplate armour chathead'),
      points: 100,
    }),
  ],
};
