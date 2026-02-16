import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { clientConstants } from '@/config/constants.client';
import { PlayerInfoResponse, isPlayerIronman } from '@/app/schemas/temple-api';
import * as Sentry from '@sentry/nextjs';
import { redis } from '@/redis';
import { playerGameModesKey, playerIronmanStatusKey } from '@/config/redis';
import { CheckMethod } from '@/app/schemas/inactivity-checker';

export const dynamic = 'force-dynamic';

async function getPlayerInfo(player: string) {
  const playerInfoRequest = await fetch(
    `${clientConstants.temple.baseUrl}/api/player_info.php?player=${player}`,
  );

  return playerInfoRequest.json() as Promise<PlayerInfoResponse>;
}

export async function GET(request: NextRequest) {
  const player = request.nextUrl.searchParams.get('player');
  const checkMethodParam = request.nextUrl.searchParams.get('check_method');

  console.log('Check player request:', { player, checkMethodParam });

  let checkMethod;
  try {
    checkMethod = CheckMethod.parse(checkMethodParam);
  } catch (parseError) {
    console.error('CheckMethod parse error:', parseError);
    return NextResponse.json(
      { success: false, error: 'Invalid check method' },
      { status: 400 },
    );
  }

  if (!player) {
    return NextResponse.json(
      { success: false, error: 'No player provided' },
      { status: 400 },
    );
  }

  let playerInfo;
  try {
    playerInfo = await getPlayerInfo(player);
  } catch (playerInfoError) {
    console.error('Player info error:', playerInfoError);
    return NextResponse.json(
      { success: false, error: 'Failed to get player info' },
      { status: 500 },
    );
  }

  const shouldCheckPlayer = playerInfo.data['Datapoint Cooldown'] === '-';

  try {
    // If the player has a datapoint cool-down (i.e. a number),
    // this means they have been checked very recently and cannot be checked again
    if (shouldCheckPlayer) {
      console.log(`Checking ${player} using ${checkMethod} method`);

      const urls = {
        [CheckMethod.enum.datapoint]:
          `${clientConstants.temple.baseUrl}/php/add_datapoint.php?player=${player}`,
        [CheckMethod.enum['get-game-mode']]:
          `${clientConstants.temple.baseUrl}/player-tools/getgamemode.php?username=${player}`,
      };

      await fetch(urls[checkMethod]);

      // If the game mode required an update, attempt to get the latest version and save it
      if (checkMethod === 'get-game-mode') {
        const updatedPlayerInfo = await getPlayerInfo(player);
        const playerKey = decodeURIComponent(player).toLowerCase();

        // Store both game mode and ironman status
        await redis.hset(playerGameModesKey, {
          [playerKey]: updatedPlayerInfo.data['Game mode'],
        });

        console.log(updatedPlayerInfo);

        // Calculate and store ironman status
        const ironmanStatus = isPlayerIronman(
          updatedPlayerInfo.data['Game mode'],
          updatedPlayerInfo.data.GIM,
        );

        await redis.hset(playerIronmanStatusKey, {
          [playerKey]: ironmanStatus.toString(),
        });
      }
    }

    // Purge the cache to display the latest member data
    revalidatePath('/');

    return NextResponse.json({ success: true });
  } catch (error) {
    Sentry.captureException(error);

    return NextResponse.json({ success: false });
  }
}
