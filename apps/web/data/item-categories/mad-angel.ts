import { formatWikiImageUrl } from '@/app/player/utils/format-wiki-url';
import { ItemCategory } from '@/app/schemas/items';
import { singleItem } from '../utils/item-builders';

export const madAngel: ItemCategory = {
  image: formatWikiImageUrl('Mad Angel', 'category'),
  items: [
    singleItem({
      name: 'Hallowfell',
      // Native icon is smaller than the thumbnail size, so the /thumb/ URL
      // 500s — use the full image directly.
      image: 'https://oldschool.runescape.wiki/images/Hallowfell.png',
      collectionLogCategory: 'the_mad_angel',
      targetDropSources: ['Mad Angel'],
    }),
    singleItem({
      name: 'Aggy',
      image: 'https://oldschool.runescape.wiki/images/Aggy.png',
      collectionLogCategory: 'the_mad_angel',
      targetDropSources: ['Mad Angel'],
    }),
  ],
};
