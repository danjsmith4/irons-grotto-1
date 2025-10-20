'use server';

import { authActionClient } from '@/app/safe-action';
import { z } from 'zod';
import { createCompletion, getCompletionsByTaskId } from '@/lib/db/completions';
import { ADMIN_DISCORD_USER_IDS } from '@/config/admin-users';
import { sampleBingoBoard } from '../data/sample-bingo-data';

const SubmitCompletionSchema = z.object({
    taskId: z.string(),
    clan: z.enum(['ironsGrotto', 'ironDaddy']),
    points: z.number().min(0), // Add points field
    userCompletions: z.array(z.object({
        user: z.string().min(1, 'User is required'),
        proof: z.string().url('Valid URL is required for proof'),
    })),
});

export const submitCompletionActionImpl = authActionClient
    .metadata({ actionName: 'submit-completion' })
    .schema(SubmitCompletionSchema)
    .action(async ({ parsedInput, ctx }) => {
        // Check admin access
        if (!ADMIN_DISCORD_USER_IDS.includes(ctx.userId)) {
            throw new Error('Unauthorized: Admin access required');
        }

        // Find the task to get component requirements
        let taskComponents: number | undefined;
        sampleBingoBoard.tiles.forEach(tile => {
            tile.tasks.forEach(task => {
                if (task.id === parsedInput.taskId) {
                    taskComponents = task.components;
                }
            });
        });

        // If task has defined components, validate against existing completions
        if (taskComponents !== undefined) {
            // Get existing completions for this task and clan
            const existingCompletions = await getCompletionsByTaskId(parsedInput.taskId);
            const existingClanCompletions = existingCompletions.filter(
                completion => completion.clan === parsedInput.clan
            );

            const currentCompletionCount = existingClanCompletions.length;
            const newCompletionCount = parsedInput.userCompletions.length;
            const totalAfterSubmission = currentCompletionCount + newCompletionCount;

            // Check if the new submissions would exceed the component requirement
            if (totalAfterSubmission > taskComponents) {
                throw new Error(
                    `Cannot submit ${newCompletionCount} completion(s). ` +
                    `Task requires ${taskComponents} components, but clan ${parsedInput.clan} ` +
                    `already has ${currentCompletionCount} completion(s). ` +
                    `Maximum additional submissions allowed: ${taskComponents - currentCompletionCount}`
                );
            }
        }

        // Create completions for each user
        const results = [];
        for (const completion of parsedInput.userCompletions) {
            const result = await createCompletion({
                taskId: parsedInput.taskId,
                user: completion.user,
                proof: completion.proof,
                clan: parsedInput.clan,
                points: parsedInput.points.toString(), // Convert to string as per schema
            });
            results.push(result);
        }

        return {
            success: true,
            completions: results,
            count: results.length
        };
    });
