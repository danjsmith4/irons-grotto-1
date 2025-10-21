import { db } from './index';
import { bingoCompletions, type NewBingoCompletion } from './schema';
import { eq, desc } from 'drizzle-orm';
import { sampleBingoBoard } from '../../app/bingo/data/sample-bingo-data';

export async function createCompletion(completion: NewBingoCompletion) {
    return await db.insert(bingoCompletions).values(completion).returning();
}

export async function getCompletionsByTaskId(taskId: string) {
    return await db
        .select()
        .from(bingoCompletions)
        .where(eq(bingoCompletions.taskId, taskId))
        .orderBy(bingoCompletions.createdAt);
}

export async function getCompletionsByUser(user: string) {
    return await db
        .select()
        .from(bingoCompletions)
        .where(eq(bingoCompletions.user, user))
        .orderBy(bingoCompletions.createdAt);
}

export async function getAllCompletions() {
    return await db
        .select()
        .from(bingoCompletions)
        .orderBy(bingoCompletions.createdAt);
}

export async function getCompletionsForClan(clanName: 'ironsGrotto' | 'ironDaddy') {
    return await db
        .select()
        .from(bingoCompletions)
        .where(eq(bingoCompletions.clan, clanName))
        .orderBy(bingoCompletions.createdAt);
}

export const getCompletionsPaginated = async (
    page = 0,
    limit = 10
) => {
    const offset = page * limit;

    const results = await db
        .select()
        .from(bingoCompletions)
        .orderBy(desc(bingoCompletions.createdAt))
        .limit(limit)
        .offset(offset);

    return results;
};

export interface mvp {
    user: string;
    completions: number;
    points: number;
}

export async function getMvp(team: 'ironsGrotto' | 'ironDaddy'): Promise<mvp | null> {
    // Get all completions for the team
    const completions = await db
        .select()
        .from(bingoCompletions)
        .where(eq(bingoCompletions.clan, team));

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

    // Group completions by taskId to calculate proportional points
    const taskGroups = completions.reduce((acc, completion) => {
        const taskId = completion.taskId;

        if (!acc[taskId]) {
            acc[taskId] = {
                taskPoints: parseInt(completion.points, 10) || 0,
                completions: [],
                requiredComponents: taskComponentsMap.get(taskId)
            };
        }

        acc[taskId].completions.push(completion);
        return acc;
    }, {} as Record<string, { taskPoints: number; completions: typeof completions; requiredComponents?: number }>);

    // Helper function to check if a task can be completed (predecessor constraint)
    const canTaskBeCompleted = (taskId: string): boolean => {
        const taskInfo = taskToTileIndexMap.get(taskId);
        if (!taskInfo) return false;

        // Find the tile containing this task
        const tile = sampleBingoBoard.tiles.find(t => t.id === taskInfo.tileId);
        if (!tile) return false;

        // Check if all predecessor tasks in this tile are completed
        for (let i = 0; i < taskInfo.taskIndex; i++) {
            const predecessorTask = tile.tasks[i];
            const predecessorGroup = taskGroups[predecessorTask.id];

            if (!predecessorGroup) {
                return false; // Predecessor task has no completions
            }

            const requiredComponents = taskComponentsMap.get(predecessorTask.id) ?? 1;
            if (predecessorGroup.completions.length < requiredComponents) {
                return false; // Predecessor task doesn't have enough completions
            }
        }

        return true;
    };

    // Calculate user stats with proportional points
    const userStats = {} as Record<string, mvp>;

    Object.entries(taskGroups).forEach(([taskId, taskGroup]) => {
        const totalContributions = taskGroup.completions.length;
        const requiredComponents = taskGroup.requiredComponents ?? 1;

        // Only award points if task is actually completed based on component logic AND predecessor constraint
        if (totalContributions < requiredComponents) {
            // Task not completed yet - no points awarded
            return;
        }

        if (!canTaskBeCompleted(taskId)) {
            // Predecessor tasks not completed - no points awarded
            return;
        }

        // Calculate points per contribution based on component logic
        let pointsPerContribution: number;

        if (taskGroup.requiredComponents) {
            // For tasks with components: total points / required components
            pointsPerContribution = taskGroup.taskPoints / taskGroup.requiredComponents;
        } else {
            // For tasks without components: total points / actual contributions
            pointsPerContribution = taskGroup.taskPoints / totalContributions;
        }

        // Count contributions per user for this task
        const userContributions = taskGroup.completions.reduce((acc, completion) => {
            const user = completion.user;
            acc[user] = (acc[user] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        // Assign proportional points to each user
        Object.entries(userContributions).forEach(([user, contributionCount]) => {
            if (!userStats[user]) {
                userStats[user] = { user, completions: 0, points: 0 };
            }

            // For tasks with components, limit the contribution count to avoid over-awarding
            let effectiveContributions = contributionCount;
            if (taskGroup.requiredComponents) {
                effectiveContributions = Math.min(contributionCount, taskGroup.requiredComponents);
            }

            // Add the user's share of points for this task
            const userPointShare = pointsPerContribution * effectiveContributions;
            userStats[user].points += userPointShare;
            userStats[user].completions += effectiveContributions;
        });
    });

    // Convert to array and sort by points (then by completions as tiebreaker)
    const sortedUsers = Object.values(userStats).sort((a, b) => {
        if (Math.abs(b.points - a.points) < 0.01) { // Handle floating point precision
            return b.completions - a.completions; // Tiebreaker: completions descending
        }
        return b.points - a.points; // Sort by points descending
    });

    return sortedUsers.length > 0 ?
        { ...sortedUsers[0], points: Math.round(sortedUsers[0].points * 100) / 100 } : // Round to 2 decimal places
        null;
}

export async function getUserNames(): Promise<string[]> {
    const users = await db
        .selectDistinct({ user: bingoCompletions.user })
        .from(bingoCompletions);

    return users.map(row => row.user);
}