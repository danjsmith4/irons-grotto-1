'use server';

import { actionClient } from '@/app/safe-action';
import { getUserNames } from "@/lib/db/completions";
import { z } from 'zod';

export const loadUsersAction = actionClient
    .metadata({ actionName: 'load-users' })
    .schema(z.object({})) // No input needed
    .action(async () => {
        try {
            const users = await getUserNames();
            return {
                success: true,
                users
            };
        } catch (error) {
            console.error('Failed to load users:', error);
            throw new Error('Failed to load users');
        }
    });