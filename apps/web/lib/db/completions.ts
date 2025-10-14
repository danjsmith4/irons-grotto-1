import { db } from './index';
import { bingoCompletions, type NewBingoCompletion } from './schema';
import { eq, desc } from 'drizzle-orm';

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

    // Group completions by taskId to calculate proportional points
    const taskGroups = completions.reduce((acc, completion) => {
        const taskId = completion.taskId;

        if (!acc[taskId]) {
            acc[taskId] = {
                taskPoints: parseInt(completion.points, 10) || 0,
                completions: []
            };
        }

        acc[taskId].completions.push(completion);
        return acc;
    }, {} as Record<string, { taskPoints: number; completions: typeof completions }>);

    // Calculate user stats with proportional points
    const userStats = {} as Record<string, mvp>;

    Object.values(taskGroups).forEach(taskGroup => {
        const totalContributions = taskGroup.completions.length;
        const pointsPerContribution = taskGroup.taskPoints / totalContributions;

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

            // Add the user's share of points for this task
            const userPointShare = pointsPerContribution * contributionCount;
            userStats[user].points += userPointShare;
            userStats[user].completions += contributionCount;
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