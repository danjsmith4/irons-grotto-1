import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { players } from '@/lib/db/schema';
import { fetchPlayerDetails } from '@/app/rank-calculator/data-sources/fetch-player-details/fetch-player-details';

export const dynamic = 'force-dynamic';

async function getAllPlayers() {
    const allPlayers = await db
        .select({
            playerName: players.playerName,
            discordUserId: players.discordUserId,
        })
        .from(players);

    return allPlayers;
}

export async function GET() {
    try {
        // Get all players from database
        const allPlayers = await getAllPlayers();

        if (allPlayers.length === 0) {
            return NextResponse.json({
                success: true,
                message: 'No players found to update',
                playersUpdated: 0
            });
        }

        // Temple API rate limit: 10 requests per minute for datapoint endpoints
        // So we use 6 second delays between requests
        const dataPointRateLimitSeconds = 6000; // 6 seconds in milliseconds

        const results = [];
        let successCount = 0;
        let errorCount = 0;

        // Process each player with rate limiting
        for (let i = 0; i < allPlayers.length; i++) {
            const player = allPlayers[i];

            try {
                // Add delay except for first player
                if (i > 0) {
                    await new Promise(resolve => setTimeout(resolve, dataPointRateLimitSeconds));
                }

                // Fetch fresh player details (mergeSavedData = false for complete refresh)
                const result = await fetchPlayerDetails(player.playerName, player.discordUserId, false);

                if (result.success) {
                    successCount++;
                    results.push({
                        playerName: player.playerName,
                        success: true,
                        message: 'Updated successfully'
                    });
                } else {
                    errorCount++;
                    results.push({
                        playerName: player.playerName,
                        success: false,
                        error: result.error || 'Failed to fetch player details'
                    });
                }
            } catch (error) {
                errorCount++;
                results.push({
                    playerName: player.playerName,
                    success: false,
                    error: error instanceof Error ? error.message : 'Unknown error'
                });
            }
        }

        return NextResponse.json({
            success: true,
            message: `Batch update completed: ${successCount} successful, ${errorCount} failed`,
            playersUpdated: successCount,
            playersTotal: allPlayers.length,
            results
        });

    } catch (error) {
        console.error('Failed to update all players:', error);
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error occurred'
            },
            { status: 500 }
        );
    }
}