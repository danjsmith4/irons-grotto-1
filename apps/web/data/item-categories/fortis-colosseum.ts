import { formatWikiImageUrl } from '@/app/rank-calculator/utils/format-wiki-url';
import { ItemCategory } from '@/app/schemas/items';
import { manualItem } from '../utils/item-builders';

export const fortisColosseum: ItemCategory = {
  image: formatWikiImageUrl('Smol heredit detail', 'category'),
  items: [
    manualItem({
      name: "Blessed dizana's quiver",
      points: 100,
    }),
  ],
};
