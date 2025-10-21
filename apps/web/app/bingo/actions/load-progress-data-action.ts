'use server';

import { actionClient } from '@/app/safe-action';
import { getAllCompletions } from '@/lib/db/completions';
import { sampleBingoBoard } from '../data/sample-bingo-data';
import { z } from 'zod';

export const loadProgressDataAction = actionClient
    .metadata({ actionName: 'load-progress-data' })
    .schema(z.object({})) // No input needed
    .action(async () => {
        try {
            // Get all completions from database
            const completions = await getAllCompletions();

            // Create maps for task validation
            const taskInfoMap = new Map<string, { components?: number; points: number }>();
            const taskToTileIndexMap = new Map<string, { tileId: string; taskIndex: number }>();

            sampleBingoBoard.tiles.forEach(tile => {
                tile.tasks.forEach((task, index) => {
                    taskInfoMap.set(task.id, {
                        components: task.components,
                        points: task.points
                    });
                    taskToTileIndexMap.set(task.id, { tileId: tile.id, taskIndex: index });
                });
            });

            // Group completions by task and team, track completion dates
            const taskTeamCompletions = new Map<string, {
                taskId: string;
                team: string;
                completions: { date: string; user: string }[];
                taskInfo: { components?: number; points: number };
            }>();

            completions.forEach(completion => {
                const key = `${completion.taskId}-${completion.clan}`;
                const date = new Date(completion.createdAt).toISOString().split('T')[0];
                const taskInfo = taskInfoMap.get(completion.taskId);

                if (!taskInfo) return; // Skip if task not found in board

                if (!taskTeamCompletions.has(key)) {
                    taskTeamCompletions.set(key, {
                        taskId: completion.taskId,
                        team: completion.clan,
                        completions: [],
                        taskInfo
                    });
                }

                taskTeamCompletions.get(key)!.completions.push({
                    date,
                    user: completion.user
                });
            });

            // Calculate when each task was actually completed based on component logic AND predecessor constraint
            const taskCompletionDates = new Map<string, {
                taskId: string;
                team: string;
                completionDate: string; // Date when task was actually completed
                points: number;
            }>();

            // Helper function to check if a task can be completed (predecessor constraint)
            const canTaskBeCompleted = (taskId: string, team: string): boolean => {
                const taskInfo = taskToTileIndexMap.get(taskId);
                if (!taskInfo) return false;

                // Find the tile containing this task
                const tile = sampleBingoBoard.tiles.find(t => t.id === taskInfo.tileId);
                if (!tile) return false;

                // Check if all predecessor tasks in this tile are completed for this team
                for (let i = 0; i < taskInfo.taskIndex; i++) {
                    const predecessorTask = tile.tasks[i];
                    const predecessorKey = `${predecessorTask.id}-${team}`;
                    const predecessorData = taskTeamCompletions.get(predecessorKey);

                    if (!predecessorData) {
                        return false; // Predecessor task has no completions
                    }

                    const requiredComponents = predecessorData.taskInfo.components ?? 1;
                    if (predecessorData.completions.length < requiredComponents) {
                        return false; // Predecessor task doesn't have enough completions
                    }
                }

                return true;
            };

            taskTeamCompletions.forEach((data, key) => {
                const { taskInfo, completions } = data;
                const requiredComponents = taskInfo.components ?? 1;

                // Sort completions by date to find when we reached the required amount
                const sortedCompletions = completions.sort((a, b) => a.date.localeCompare(b.date));

                if (sortedCompletions.length >= requiredComponents && canTaskBeCompleted(data.taskId, data.team)) {
                    // Task is completed and all prerequisites are met - use the date of the Nth completion
                    const completionDate = sortedCompletions[requiredComponents - 1].date;

                    taskCompletionDates.set(key, {
                        taskId: data.taskId,
                        team: data.team,
                        completionDate,
                        points: taskInfo.points
                    });
                }
            });

            // Group completed tasks by team and date, sum points
            const progressData = new Map<string, Map<string, number>>();

            // Initialize teams
            progressData.set('ironsGrotto', new Map());
            progressData.set('ironDaddy', new Map());

            // Sum points by team and completion date
            Array.from(taskCompletionDates.values()).forEach(({ team, completionDate, points }) => {
                const teamData = progressData.get(team)!;
                const currentPoints = teamData.get(completionDate) ?? 0;
                teamData.set(completionDate, currentPoints + points);
            });

            // Convert to cumulative points over time
            const teams = ['ironsGrotto', 'ironDaddy'];
            const result: {
                team: string;
                data: { date: string; points: number; cumulativePoints: number }[];
            }[] = [];

            teams.forEach(team => {
                const teamData = progressData.get(team)!;
                const sortedDates = Array.from(teamData.keys()).sort();

                let cumulativePoints = 0;
                const data = sortedDates.map(date => {
                    const dailyPoints = teamData.get(date)!;
                    cumulativePoints += dailyPoints;
                    return {
                        date,
                        points: dailyPoints,
                        cumulativePoints
                    };
                });

                result.push({
                    team,
                    data
                });
            });

            return {
                success: true,
                progressData: result
            };
        } catch (error) {
            console.error('Failed to load progress data:', error);
            throw new Error('Failed to load progress data');
        }
    });