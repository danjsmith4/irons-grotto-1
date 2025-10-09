'use server';

import { z } from 'zod';
import { actionClient } from '@/app/safe-action';
import { clientConstants } from '@/config/constants.client';
import { ActionError } from '@/app/action-error';
import { cookies } from 'next/headers';

const ValidatePasswordSchema = z.object({
    password: z.string().min(1, 'Password is required'),
});

export const validatePasswordAction = actionClient
    .metadata({ actionName: 'validate-bingo-password' })
    .schema(ValidatePasswordSchema)
    .action(async ({ parsedInput: { password } }) => {
        if (password !== clientConstants.bingo.password) {
            throw new ActionError('Invalid password. Please try again.');
        }

        // Set a cookie to remember the validation for this session
        const cookieStore = await cookies();
        cookieStore.set('bingo-access', 'true', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 60 * 60 * 24, // 24 hours
        });

        return {
            success: true,
            message: 'Password validated successfully!',
        };
    });
