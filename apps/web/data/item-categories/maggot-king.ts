import { formatWikiImageUrl } from '@/app/rank-calculator/utils/format-wiki-url';
import { ItemCategory } from '@/app/schemas/items';
import { singleItem } from '../utils/item-builders';

export const maggotKing: ItemCategory = {
  image: formatWikiImageUrl('Maggot King', 'category'),
  items: [
    singleItem({
      name: 'Elder venator fang',
      collectionLogCategory: 'maggot_king',
      targetDropSources: ['Maggot King'],
    }),
    singleItem({
      name: 'Crimson kisten',
      collectionLogCategory: 'maggot_king',
      targetDropSources: ['Maggot King'],
    }),
    singleItem({
      name: 'Maggot marquess',
      collectionLogCategory: 'maggot_king',
      targetDropSources: ['Maggot King'],
    }),
  ],
};
