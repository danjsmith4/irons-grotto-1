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

        // Create maps for task validation
        const taskComponentsMap = new Map<string, number>();
        const taskToTileIndexMap = new Map<string, { tileId: string; taskIndex: number }>();

        sampleBingoBoard.tiles.forEach(tile => {
            tile.tasks.forEach((task, index) => {
                if (task.components) {
                    taskComponentsMap.set(task.id, task.components);
                }
                taskToTileIndexMap.set(task.id, { tileId: tile.id, taskIndex: index });
            });
        });

        // Function to get completed task IDs based on component validation and predecessor constraint
        const getCompletedTaskIds = (completions: typeof ironsGrottoCompletions) => {
            const taskCounts = completions.reduce((acc, completion) => {
                acc[completion.taskId] = (acc[completion.taskId] || 0) + 1;
                return acc;
            }, {} as Record<string, number>);

            // Helper function to check if a task can be completed (predecessor constraint)
            const canTaskBeCompleted = (taskId: string, completedTasks: string[]): boolean => {
                const taskInfo = taskToTileIndexMap.get(taskId);
                if (!taskInfo) return false;

                // Find the tile containing this task
                const tile = sampleBingoBoard.tiles.find(t => t.id === taskInfo.tileId);
                if (!tile) return false;

                // Check if all predecessor tasks in this tile are completed
                for (let i = 0; i < taskInfo.taskIndex; i++) {
                    const predecessorTask = tile.tasks[i];
                    if (!completedTasks.includes(predecessorTask.id)) {
                        return false; // Predecessor task not completed yet
                    }
                }

                return true;
            };

            const completedTasks: string[] = [];

            // We need to process tasks in tile order to respect predecessor constraints
            sampleBingoBoard.tiles.forEach(tile => {
                tile.tasks.forEach(task => {
                    const taskId = task.id;
                    const count = taskCounts[taskId] || 0;
                    const requiredComponents = taskComponentsMap.get(taskId) ?? 1;

                    // Check if this task has enough completions
                    if (count >= requiredComponents) {
                        // Check if predecessor tasks are completed
                        if (canTaskBeCompleted(taskId, completedTasks)) {
                            completedTasks.push(taskId);
                        }
                    }
                });
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