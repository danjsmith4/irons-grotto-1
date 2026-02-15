import * as Sentry from '@sentry/nextjs';
import { clientConstants } from '@/config/constants.client';
import { serverConstants } from '@/config/constants.server';
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { players } from '@/lib/db/schema';
import { isNotNull } from 'drizzle-orm';

export async function GET() {
  try {
    // Get all players from the database that have a discord user ID
    const allPlayers = await db
      .select({
        discordUserId: players.discordUserId,
        playerName: players.playerName,
      })
      .from(players)
      .where(isNotNull(players.discordUserId));

    // Group players by discord ID
    const playersByDiscordId = allPlayers.reduce(
      (acc, player) => {
        if (!player.discordUserId) return acc;

        if (!acc[player.discordUserId]) {
          acc[player.discordUserId] = [];
        }
        acc[player.discordUserId].push(player.playerName);
        return acc;
      },
      {} as Record<string, string[]>,
    );

    const playerDetails = Object.entries(playersByDiscordId).map(
      ([discordId, playerNames]) => ({
        discordId,
        players: playerNames,
      }),
    );

    let delay = 0;

    const requests = playerDetails.flatMap(({ discordId, players }) =>
      players.map((player) => {
        const url = new URL(`${clientConstants.publicUrl}/api/check-auto-rank`);

        url.searchParams.append('player', player);
        url.searchParams.append('discord_id', discordId);
        url.searchParams.append(
          // Temple's API is rate limited to 10 requests per minute for datapoint endpoints,
          // so we need to wait for six seconds before checking the next player
          '_delay',
          delay.toFixed(0),
        );

        delay += 6;

        return { url, method: 'GET' };
      }),
    );

    const queueResponse = await fetch(
      `${serverConstants.zeplo.url}/bulk?_token=${serverConstants.zeplo.apiKey}`,
      { method: 'POST', body: JSON.stringify(requests) },
    );

    return NextResponse.json({ success: queueResponse.ok });
  } catch (error) {
    Sentry.captureException(error);

    return NextResponse.json({ success: false });
  }
}
