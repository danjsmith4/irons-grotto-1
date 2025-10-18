'use server';

import { actionClient } from '@/app/safe-action';
import { getAllCompletions } from '@/lib/db/completions';
import { z } from 'zod';

export const loadProgressDataAction = actionClient
    .metadata({ actionName: 'load-progress-data' })
    .schema(z.object({})) // No input needed
    .action(async () => {
        try {
            // Get all completions from database
            const completions = await getAllCompletions();

            // Create a map to dedupe task completions by task-team combination
            const taskCompletionMap = new Map<string, {
                taskId: string;
                team: string;
                date: string; // YYYY-MM-DD format
                points: number;
            }>();

            // Process completions and dedupe by task-team
            completions.forEach(completion => {
                const key = `${completion.taskId}-${completion.clan}`;
                const date = new Date(completion.createdAt).toISOString().split('T')[0]; // Get YYYY-MM-DD
                const points = parseInt(completion.points, 10) || 0;

                // Only keep the earliest completion for each task-team combination
                if (!taskCompletionMap.has(key)) {
                    taskCompletionMap.set(key, {
                        taskId: completion.taskId,
                        team: completion.clan,
                        date,
                        points
                    });
                } else {
                    const existing = taskCompletionMap.get(key)!;
                    if (date < existing.date) {
                        // Update with earlier date
                        taskCompletionMap.set(key, {
                            taskId: completion.taskId,
                            team: completion.clan,
                            date,
                            points
                        });
                    }
                }
            });

            // Group by team and date, sum points
            const progressData = new Map<string, Map<string, number>>();

            // Initialize teams
            progressData.set('ironsGrotto', new Map());
            progressData.set('ironDaddy', new Map());

            // Sum points by team and date
            Array.from(taskCompletionMap.values()).forEach(({ team, date, points }) => {
                const teamData = progressData.get(team)!;
                const currentPoints = teamData.get(date) ?? 0;
                teamData.set(date, currentPoints + points);
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