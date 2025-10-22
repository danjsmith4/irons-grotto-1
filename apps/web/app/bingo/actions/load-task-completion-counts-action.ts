'use server';

import { getAllCompletions } from '@/lib/db/completions';
import { sampleBingoBoard } from '../data/sample-bingo-data';

export interface TaskCompletionCount {
    taskId: string;
    taskTitle: string;
    taskDescription: string;
    tileHeader: string;
    components?: number;
    ironsGrottoCount: number;
    ironDaddyCount: number;
}

export async function loadTaskCompletionCountsAction(): Promise<{
    success: boolean;
    taskCounts: TaskCompletionCount[];
    error?: string;
}> {
    try {
        const completions = await getAllCompletions();

        // Create task info map
        const taskInfoMap = new Map<string, { title: string; description: string; tileHeader: string; components?: number }>();
        sampleBingoBoard.tiles.forEach(tile => {
            tile.tasks.forEach(task => {
                taskInfoMap.set(task.id, {
                    title: task.title,
                    description: task.description,
                    tileHeader: tile.header,
                    components: task.components
                });
            });
        });

        // Count completions by task and clan
        const completionCounts = new Map<string, { ironsGrotto: number; ironDaddy: number }>();

        completions.forEach(completion => {
            const taskId = completion.taskId;
            const clan = completion.clan as 'ironsGrotto' | 'ironDaddy';

            if (!completionCounts.has(taskId)) {
                completionCounts.set(taskId, { ironsGrotto: 0, ironDaddy: 0 });
            }

            const counts = completionCounts.get(taskId)!;
            counts[clan]++;
        });

        // Build result array
        const taskCounts: TaskCompletionCount[] = [];

        // Go through tasks in order from the bingo board
        sampleBingoBoard.tiles.forEach(tile => {
            tile.tasks.forEach(task => {
                const counts = completionCounts.get(task.id) ?? { ironsGrotto: 0, ironDaddy: 0 };
                const taskInfo = taskInfoMap.get(task.id);

                if (taskInfo) {
                    taskCounts.push({
                        taskId: task.id,
                        taskTitle: taskInfo.title,
                        taskDescription: taskInfo.description,
                        tileHeader: taskInfo.tileHeader,
                        components: taskInfo.components,
                        ironsGrottoCount: counts.ironsGrotto,
                        ironDaddyCount: counts.ironDaddy
                    });
                }
            });
        });

        return {
            success: true,
            taskCounts
        };
    } catch (error) {
        console.error('Failed to load task completion counts:', error);
        return {
            success: false,
            taskCounts: [],
            error: 'Failed to load task completion counts'
        };
    }
}