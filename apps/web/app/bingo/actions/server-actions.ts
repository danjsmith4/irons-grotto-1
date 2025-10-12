'use server';

import { submitCompletionActionImpl } from './submit-completion-action';

// Alternative: create a wrapper function if needed
export async function submitCompletionAction(input: {
    taskId: string;
    clan: 'ironsGrotto' | 'ironDaddy';
    points: number;
    userCompletions: {
        user: string;
        proof: string;
    }[];
}) {
    return submitCompletionActionImpl(input);
}