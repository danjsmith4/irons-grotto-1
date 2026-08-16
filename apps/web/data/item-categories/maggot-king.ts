import { formatWikiImageUrl } from '@/app/rank-calculator/utils/format-wiki-url';
import { ItemCategory } from '@/app/schemas/items';
import { singleItem } from '../utils/item-builders';

export const maggotKing: ItemCategory = {
  image: formatWikiImageUrl('Maggot King', 'category'),
  items: [
    singleItem({
      name: 'Elder venator fang',
      // Native icon is smaller than the thumbnail size, so the /thumb/ URL
      // 500s — use the full image directly.
      image: 'https://oldschool.runescape.wiki/images/Elder_venator_fang.png',
      collectionLogCategory: 'maggot_king',
      targetDropSources: ['Maggot King'],
    }),
    singleItem({
      name: 'Crimson kisten',
      image: 'https://oldschool.runescape.wiki/images/Crimson_kisten.png',
      collectionLogCategory: 'maggot_king',
      targetDropSources: ['Maggot King'],
    }),
    singleItem({
      name: 'Maggot marquess',
      image: 'https://oldschool.runescape.wiki/images/Maggot_marquess.png',
      collectionLogCategory: 'maggot_king',
      targetDropSources: ['Maggot King'],
    }),
  ],
};
