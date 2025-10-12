'use server';

import { getCompletionsPaginated } from '@/lib/db/completions';

export async function loadCompletionsPaginatedAction(page: number = 1, pageSize: number = 10) {
    try {
        // Convert from 1-based (frontend) to 0-based (database) pagination
        const dbPage = page - 1;
        const completions = await getCompletionsPaginated(dbPage, pageSize);

        return {
            success: true,
            completions,
            hasMore: completions.length === pageSize, // If we got a full page, there might be more
        };
    } catch (error) {
        console.error('Failed to load paginated completions:', error);
        return {
            success: false,
            completions: [],
            hasMore: false,
            error: 'Failed to load completions',
        };
    }
}