'use server';

import { getMvp, type mvp } from '@/lib/db/completions';

export async function loadMvpAction() {
    try {
        const [ironsGrottoMvp, ironDaddyMvp] = await Promise.all([
            getMvp('ironsGrotto'),
            getMvp('ironDaddy')
        ]);

        return {
            success: true,
            mvps: {
                ironsGrotto: ironsGrottoMvp,
                ironDaddy: ironDaddyMvp
            }
        };
    } catch (error) {
        console.error('Failed to load MVPs:', error);
        return {
            success: false,
            mvps: {
                ironsGrotto: null,
                ironDaddy: null
            },
            error: 'Failed to load MVPs'
        };
    }
}