'use server';

import { signIn } from '@/auth';

/**
 * Special sign-in function for admin panel that bypasses guild checking
 */
export async function signInForAdmin() {
    // Set a temporary flag that can be checked in the auth callback
    // This is a workaround since NextAuth doesn't expose redirect context in signIn callback

    return await signIn('discord', {
        redirectTo: '/bingo/admin',
        // We could add custom parameters here if needed
    });
}