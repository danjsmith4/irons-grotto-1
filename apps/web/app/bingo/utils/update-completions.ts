import { writeFileSync } from 'fs';
import { join } from 'path';
import { ClanCompletions } from '../types/bingo-tile';

/**
 * Utility function to update clan completions
 * This would typically be called from an admin interface or API endpoint
 */
export function updateClanCompletions(
    clanName: 'ironsGrotto' | 'ironDaddy',
    taskIds: string[]
) {
    const completionsPath = join(process.cwd(), 'apps/web/app/bingo/data/clan-completions.json');

    try {
        const currentCompletions = require(completionsPath) as ClanCompletions;

        const updatedCompletions: ClanCompletions = {
            ...currentCompletions,
            [clanName]: taskIds,
        };

        writeFileSync(completionsPath, JSON.stringify(updatedCompletions, null, 2));

        return { success: true, message: 'Completions updated successfully' };
    } catch (error) {
        return { success: false, message: 'Failed to update completions' };
    }
}

/**
 * Add a single task completion for a clan
 */
export function addTaskCompletion(
    clanName: 'ironsGrotto' | 'ironDaddy',
    taskId: string
) {
    const completionsPath = join(process.cwd(), 'apps/web/app/bingo/data/clan-completions.json');

    try {
        const currentCompletions = require(completionsPath) as ClanCompletions;

        if (!currentCompletions[clanName].includes(taskId)) {
            currentCompletions[clanName].push(taskId);
        }

        writeFileSync(completionsPath, JSON.stringify(currentCompletions, null, 2));

        return { success: true, message: 'Task completion added successfully' };
    } catch (error) {
        return { success: false, message: 'Failed to add task completion' };
    }
}

/**
 * Remove a single task completion for a clan
 */
export function removeTaskCompletion(
    clanName: 'ironsGrotto' | 'ironDaddy',
    taskId: string
) {
    const completionsPath = join(process.cwd(), 'apps/web/app/bingo/data/clan-completions.json');

    try {
        const currentCompletions = require(completionsPath) as ClanCompletions;

        currentCompletions[clanName] = currentCompletions[clanName].filter(id => id !== taskId);

        writeFileSync(completionsPath, JSON.stringify(currentCompletions, null, 2));

        return { success: true, message: 'Task completion removed successfully' };
    } catch (error) {
        return { success: false, message: 'Failed to remove task completion' };
    }
}
