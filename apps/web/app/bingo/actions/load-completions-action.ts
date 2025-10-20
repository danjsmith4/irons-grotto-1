'use server';

import { getCompletionsForClan } from '@/lib/db/completions';
import { ClanCompletions } from '../types/bingo-tile';
import { sampleBingoBoard } from '../data/sample-bingo-data';

export async function loadCompletionsAction(): Promise<ClanCompletions> {
    try {
        // Get completions for both clans
        const [ironsGrottoCompletions, ironDaddyCompletions] = await Promise.all([
            getCompletionsForClan('ironsGrotto'),
            getCompletionsForClan('ironDaddy')
        ]);

        // Create a map of task ID to required components for validation
        const taskComponentsMap = new Map<string, number>();
        sampleBingoBoard.tiles.forEach(tile => {
            tile.tasks.forEach(task => {
                if (task.components) {
                    taskComponentsMap.set(task.id, task.components);
                }
            });
        });

        // Function to get completed task IDs based on component validation
        const getCompletedTaskIds = (completions: typeof ironsGrottoCompletions) => {
            const taskCounts = completions.reduce((acc, completion) => {
                acc[completion.taskId] = (acc[completion.taskId] || 0) + 1;
                return acc;
            }, {} as Record<string, number>);

            const completedTasks: string[] = [];
            Object.entries(taskCounts).forEach(([taskId, count]) => {
                const requiredComponents = taskComponentsMap.get(taskId);

                if (requiredComponents) {
                    // Task has defined components - check if we have enough completions
                    if (count >= requiredComponents) {
                        completedTasks.push(taskId);
                    }
                } else {
                    // Task has no defined components - any completion marks it as complete
                    completedTasks.push(taskId);
                }
            });

            return completedTasks;
        };

        // Extract completed task IDs based on component validation
        const ironsGrottoTaskIds = getCompletedTaskIds(ironsGrottoCompletions);
        const ironDaddyTaskIds = getCompletedTaskIds(ironDaddyCompletions);

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