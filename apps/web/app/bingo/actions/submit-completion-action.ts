'use server';

import { authActionClient } from '@/app/safe-action';
import { z } from 'zod';
import { createCompletion } from '@/lib/db/completions';
import { ADMIN_DISCORD_USER_IDS } from '@/config/admin-users';

const SubmitCompletionSchema = z.object({
    taskId: z.string(),
    clan: z.enum(['ironsGrotto', 'ironDaddy']),
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

        // Create completions for each user
        const results = [];
        for (const completion of parsedInput.userCompletions) {
            const result = await createCompletion({
                taskId: parsedInput.taskId,
                user: completion.user,
                proof: completion.proof,
                clan: parsedInput.clan,
            });
            results.push(result);
        }

        return {
            success: true,
            completions: results,
            count: results.length
        };
    });
