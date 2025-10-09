import { clientConstants } from '@/config/constants.client';

export const formatWikiImageUrl = (
    entityName: string,
    size = 64,
) => {
    const imageName = encodeURIComponent(entityName.replaceAll(' ', '_'));

    return `${clientConstants.wiki.baseUrl}/images/thumb/${imageName}.png/${size}px-${imageName}.png`;
};
