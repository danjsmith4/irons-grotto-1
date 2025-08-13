import { formatWikiImageUrl } from '@/app/rank-calculator/utils/format-wiki-url';
import { ItemCategory } from '@/app/schemas/items';
import { singleItem } from '../utils/item-builders';



/**
Expected Deep delves to complete cloth: 667.0588235294117
Expected Deep delves to complete ayak: 696.9767441860465
Expected Deep delves to complete treads: 740.5714285714284
Expected Deep delves to complete dom: 970.739299610895
 */
export const doom: ItemCategory = {
    image: formatWikiImageUrl('Doom_of_Mokhaiotl', 'category'),
    items: [
        singleItem({
            name: 'Mokhaiotl cloth',
            collectionLogCategory: 'doom_of_mokhaiotl',
            points: Math.ceil(667.05 / 18)
        }),
        singleItem({
            name: 'Eye of ayak (uncharged)',
            collectionLogCategory: 'doom_of_mokhaiotl',
            points: Math.ceil(696.97 / 18)
        }),
        singleItem({
            name: 'Avernic treads',
            collectionLogCategory: 'doom_of_mokhaiotl',
            points: Math.ceil(740.571 / 18)
        }),
        singleItem({
            name: 'Dom',
            collectionLogCategory: 'doom_of_mokhaiotl',
            points: Math.ceil(970.739 / 18)
        }),
    ],
}