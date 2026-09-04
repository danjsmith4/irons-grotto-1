import * as Sentry from '@sentry/nextjs';
import { z } from 'zod';
import dedent from 'dedent';
import {
  APIDMChannel,
  ButtonStyle,
  ComponentType,
  Routes,
} from 'discord-api-types/v10';
import { NextRequest, NextResponse } from 'next/server';
import { fetchPlayerDetails } from '@/app/player/data-sources/fetch-player-details/fetch-player-details';
import { scoreStoredPlayer } from '@/app/data-sources/score-players-from-record';
import { getRankName } from '@/app/player/utils/get-rank-name';
import { isRankUp } from '@/app/player/utils/is-rank-up';
import { canApplyForRank } from '@/config/ranks';
import { sendDiscordMessage } from '@/app/player/utils/send-discord-message';
import { clientConstants } from '@/config/constants.client';
import { rankUpMessagesKey } from '@/config/redis';
import { discordBotClient } from '@/discord';
import { redis } from '@/redis';
import {
  getPlayerByName,
  processPlayerData,
} from '@/lib/db/player-operations';

export async function GET(request: NextRequest) {
  try {
    const player = z
      .string({ required_error: 'Player is required' })
      .transform((encodedPlayer) => decodeURIComponent(encodedPlayer))
      .parse(request.nextUrl.searchParams.get('player'));

    const discordId = z
      .string({ required_error: 'Discord ID is required' })
      .parse(request.nextUrl.searchParams.get('discord_id'));

    const playerDetails = await fetchPlayerDetails(player, discordId);

    if (!playerDetails.success) {
      throw new Error('Failed to fetch player details');
    }

    const { currentRank, hasThirdPartyData, playerName, accountType } =
      playerDetails.data;

    if (!hasThirdPartyData) {
      return NextResponse.json({ success: true });
    }
    // Sync player data to postgres database for future relational queries
    try {
      await processPlayerData(playerDetails.data, discordId);
    } catch (error) {
      console.error('Failed to sync player data to database:', error);
      // Continue with rank calculation even if database sync fails
    }

    // Only the prospective rank is wanted here — `processPlayerData` above has
    // already recalculated and stored the points total. This scores the record
    // a second time rather than plumbing a return value through, which is
    // cheap: the one expensive input, the wiki drop rates, is behind
    // `unstable_cache`, and the rest is arithmetic.
    //
    // It scores the *stored* record, not the response, so the rank this nudges
    // someone towards is the one the leaderboard and the calculator will show
    // them when they act on it.
    const storedPlayer = await getPlayerByName(playerName);

    if (!storedPlayer) {
      throw new Error(`Player ${playerName} was not found after syncing`);
    }

    const {
      rankData: { rank },
    } = await scoreStoredPlayer(storedPlayer);

    // Same rule as the calculator's rank-up dialog: only a genuine promotion up
    // the ladder this account is scored against, and only for an account that
    // could apply for it — nudging a main towards an application the publish
    // action will refuse is worse than saying nothing. A staff member's stored
    // rank is an in-game staff rank, which is on no ladder, so a bare
    // inequality nudged them about a rank they may already hold.
    if (
      canApplyForRank(accountType) &&
      isRankUp(currentRank, rank, accountType)
    ) {
      const hashKey = `${discordId}:${player.toLowerCase()}`;
      const previousMessageRank = await redis.hget(rankUpMessagesKey, hashKey);

      // Send a message if the user has not been notified of this rank in the past
      if (previousMessageRank !== rank) {
        const { id: dmChannelId } = (await discordBotClient.post(
          Routes.userChannels(),
          { body: { recipient_id: discordId } },
        )) as APIDMChannel;

        await sendDiscordMessage(
          {
            content: dedent`
              Congratulations, you are eligible for the ${getRankName(rank)} rank on ${playerName}!
              
              Click the button below to go to the rank calculator and apply.
            `,
            components: [
              {
                components: [
                  {
                    label: 'Apply for rank',
                    url: `${clientConstants.publicUrl}/player/${encodeURIComponent(player)}`,
                    style: ButtonStyle.Link,
                    type: ComponentType.Button,
                  },
                ],
                type: ComponentType.ActionRow,
              },
            ],
          },
          dmChannelId,
        );

        await redis.hset(rankUpMessagesKey, { [hashKey]: rank });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    Sentry.captureException(error);

    return NextResponse.json({ success: false });
  }
}
