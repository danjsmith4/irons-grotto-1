import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { players } from '@/lib/db/schema';
import { fetchPlayerDetails } from '@/app/rank-calculator/data-sources/fetch-player-details/fetch-player-details';
import { syncPlayerAccountType } from '@/app/rank-calculator/utils/sync-player-account-type';

export const dynamic = 'force-dynamic';

async function getAllPlayers() {
  const allPlayers = await db
    .select({
      playerName: players.playerName,
      discordUserId: players.discordUserId,
      accountType: players.accountType,
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
        playersUpdated: 0,
      });
    }

    // Temple API rate limit: 10 requests per minute for datapoint endpoints
    // So we use 6 second delays between requests
    const dataPointRateLimitSeconds = 6000; // 6 seconds in milliseconds

    const results = [];
    let successCount = 0;
    let errorCount = 0;
    // Players whose discord account is gone, and players we simply could not
    // reach discord for — surfaced so a batch run never hides either silently.
    const playersMissingFromDiscord: string[] = [];
    const playersWithStaleDiscordRoles: string[] = [];
    // Players whose game mode nothing can settle — TempleOSRS cannot tell a
    // group ironman it has not been told about from a main. These are exactly
    // the players the calculator will ask on their next visit.
    const playersNeedingAccountType: string[] = [];
    let accountTypesResolved = 0;

    // Process each player with rate limiting
    for (let i = 0; i < allPlayers.length; i++) {
      const player = allPlayers[i];

      try {
        // Add delay except for first player
        if (i > 0) {
          await new Promise((resolve) =>
            setTimeout(resolve, dataPointRateLimitSeconds),
          );
        }

        // Game mode first, and independently of the heavy refresh below: it is
        // one cheap request, and populating it in a batch is what keeps the
        // account-type prompt off most players' screens.
        const accountTypeSync = await syncPlayerAccountType(
          player.playerName,
          player.accountType,
        );

        if (accountTypeSync.outcome === 'unresolved') {
          playersNeedingAccountType.push(player.playerName);
        } else if (accountTypeSync.outcome === 'updated') {
          accountTypesResolved++;
        }

        // Fetch fresh player details (mergeSavedData = false for complete refresh)
        const result = await fetchPlayerDetails(
          player.playerName,
          player.discordUserId,
          false,
        );

        if (result.success) {
          successCount++;

          const { discordMembership } = result.data;

          if (discordMembership === 'not-a-member') {
            playersMissingFromDiscord.push(player.playerName);
          } else if (discordMembership === 'unavailable') {
            playersWithStaleDiscordRoles.push(player.playerName);
          }

          results.push({
            playerName: player.playerName,
            success: true,
            message: 'Updated successfully',
            accountType: accountTypeSync.accountType,
            ...(accountTypeSync.outcome === 'unresolved' && {
              accountTypeWarning:
                'Game mode could not be resolved — this player will be asked on their next calculator visit',
            }),
            ...(discordMembership === 'not-a-member' && {
              warning: `Discord user ${player.discordUserId} is no longer in the guild — diary bonus points have been cleared`,
            }),
            ...(discordMembership === 'unavailable' && {
              warning:
                'Could not reach discord — diary bonus points were carried over from the previous run',
            }),
          });
        } else {
          errorCount++;
          results.push({
            playerName: player.playerName,
            success: false,
            error: result.error ?? 'Failed to fetch player details',
          });
        }
      } catch (error) {
        errorCount++;
        results.push({
          playerName: player.playerName,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    if (playersNeedingAccountType.length > 0) {
      console.warn(
        `Game mode could not be resolved for: ${playersNeedingAccountType.join(', ')}`,
      );
    }

    if (playersMissingFromDiscord.length > 0) {
      console.warn(
        `Players no longer in the discord guild: ${playersMissingFromDiscord.join(', ')}`,
      );
    }

    if (playersWithStaleDiscordRoles.length > 0) {
      console.warn(
        `Discord roles could not be read for: ${playersWithStaleDiscordRoles.join(', ')}`,
      );
    }

    return NextResponse.json({
      success: true,
      message: `Batch update completed: ${successCount} successful, ${errorCount} failed`,
      playersUpdated: successCount,
      playersTotal: allPlayers.length,
      accountTypesResolved,
      playersNeedingAccountType,
      playersMissingFromDiscord,
      playersWithStaleDiscordRoles,
      results,
    });
  } catch (error) {
    console.error('Failed to update all players:', error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : 'Unknown error occurred',
      },
      { status: 500 },
    );
  }
}
