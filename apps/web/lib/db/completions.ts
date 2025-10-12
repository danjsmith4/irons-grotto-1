import { db } from './index';
import { bingoCompletions, type NewBingoCompletion } from './schema';
import { eq } from 'drizzle-orm';

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
