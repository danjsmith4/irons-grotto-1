'use server';

import { ADMIN_DISCORD_USER_IDS } from '@/config/admin-users';
import { authActionClient } from '@/app/safe-action';
import { z } from 'zod';

export const checkAdminAccessAction = authActionClient
    .metadata({ actionName: 'check-admin-access' })
    .schema(z.object({}))
    .action(async ({ ctx }) => {
        const hasAdminAccess = ADMIN_DISCORD_USER_IDS.includes(ctx.userId);

        return { hasAdminAccess };
    });
