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

    // Group by user and calculate totals
    const userStats = completions.reduce((acc, completion) => {
        const user = completion.user;
        const points = parseInt(completion.points, 10) || 0;

        if (!acc[user]) {
            acc[user] = { user, completions: 0, points: 0 };
        }

        acc[user].completions += 1;
        acc[user].points += points;

        return acc;
    }, {} as Record<string, mvp>);

    // Convert to array and sort by points (then by completions as tiebreaker)
    const sortedUsers = Object.values(userStats).sort((a, b) => {
        if (b.points !== a.points) {
            return b.points - a.points; // Sort by points descending
        }
        return b.completions - a.completions; // Tiebreaker: completions descending
    });

    return sortedUsers.length > 0 ? sortedUsers[0] : null;
}