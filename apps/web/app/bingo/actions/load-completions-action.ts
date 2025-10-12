'use server';

import { getCompletionsForClan } from '@/lib/db/completions';
import { ClanCompletions } from '../types/bingo-tile';

export async function loadCompletionsAction(): Promise<ClanCompletions> {
    try {
        // Get completions for both clans
        const [ironsGrottoCompletions, ironDaddyCompletions] = await Promise.all([
            getCompletionsForClan('ironsGrotto'),
            getCompletionsForClan('ironDaddy')
        ]);

        // Extract unique task IDs for each clan
        const ironsGrottoTaskIds = [...new Set(ironsGrottoCompletions.map(c => c.taskId))];
        const ironDaddyTaskIds = [...new Set(ironDaddyCompletions.map(c => c.taskId))];

        return {
            ironsGrotto: ironsGrottoTaskIds,
            ironDaddy: ironDaddyTaskIds
        };
    } catch (error) {
        console.error('Failed to load clan completions:', error);
        // Return empty completions on error
        return {
            ironsGrotto: [],
            ironDaddy: []
        };
    }
}