'use server';

import { z } from 'zod';
import { actionClient } from '@/app/safe-action';
import { cookies } from 'next/headers';

export const checkAccessAction = actionClient
    .metadata({ actionName: 'check-bingo-access' })
    .schema(z.object({}))
    .action(async () => {
        const cookieStore = await cookies();
        const hasAccess = cookieStore.get('bingo-access')?.value === 'true';

        return {
            hasAccess,
        };
    });
