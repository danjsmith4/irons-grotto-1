'use server';

import { z } from 'zod';
import { userRankSubmissionsKey } from '@/config/redis';
import { redis } from '@/redis';
import { authActionClient } from '@/app/safe-action';
import { returnValidationErrors } from 'next-safe-action';
import { PlayerName } from '@/app/schemas/player';
import { Rank } from '@/config/enums';
import { fetchPlayerMeta } from '../../../../data-sources/fetch-player-meta';
import { fetchTemplePlayerStats } from '../../../../data-sources/fetch-temple-player-stats';
import { assertUniquePlayerRecord } from '../../../validation/assert-unique-player-record';
import { EditPlayerSchema } from './edit-player-schema';
import { updatePlayer } from '@/lib/db/player-operations';
import { db } from '@/lib/db';
import {
  players,
  playerAcquiredItems,
  playerAchievementDiaries,
  playerRankUps,
} from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export const editPlayerAction = authActionClient
  .metadata({ actionName: 'edit-player' })
  .schema(EditPlayerSchema)
  .bindArgsSchemas<
    [previousPlayerName: z.ZodString, currentRank: Zod.ZodOptional<typeof Rank>]
  >([PlayerName, Rank.optional()])
  .action(
    async ({
      parsedInput: { playerName, isMobileOnly },
      bindArgsParsedInputs: [previousPlayerName, currentRank],
      ctx: { userId },
    }) => {
      if (previousPlayerName !== playerName) {
        const isUsernameUnique = await assertUniquePlayerRecord(
          userId,
          playerName,
        );

        if (!isUsernameUnique) {
          returnValidationErrors(EditPlayerSchema, {
            playerName: {
              _errors: ['You have already registered this account'],
            },
          });
        }
      }

      const [playerMeta, playerStats] = await Promise.all([
        fetchPlayerMeta(playerName),
        fetchTemplePlayerStats(playerName, false),
      ]);

      const maybeFormattedPlayerName =
        playerMeta?.rsn ?? playerStats?.info.Username ?? playerName;

      const hasPlayerNameChanged =
        maybeFormattedPlayerName.toLowerCase() !==
        previousPlayerName.toLowerCase();

      const pipeline = redis.multi();

      if (hasPlayerNameChanged) {
        // Update player name in database transaction - all related tables
        await db.transaction(async (tx) => {
          // Update the main players table
          await tx
            .update(players)
            .set({
              playerName: maybeFormattedPlayerName,
              rank: currentRank,
              isMobileOnly,
              updatedAt: new Date(),
            })
            .where(eq(players.playerName, previousPlayerName));

          // Update all related tables with the new player name
          await tx
            .update(playerAcquiredItems)
            .set({ playerName: maybeFormattedPlayerName })
            .where(eq(playerAcquiredItems.playerName, previousPlayerName));

          await tx
            .update(playerAchievementDiaries)
            .set({ playerName: maybeFormattedPlayerName })
            .where(eq(playerAchievementDiaries.playerName, previousPlayerName));

          await tx
            .update(playerRankUps)
            .set({ playerName: maybeFormattedPlayerName })
            .where(eq(playerRankUps.playerName, previousPlayerName));
        });

        // Handle Redis rank submissions key rename
        const rankSubmissionsKeyExists = await redis.exists(
          userRankSubmissionsKey(userId, previousPlayerName.toLowerCase()),
        );

        if (rankSubmissionsKeyExists) {
          pipeline.renamenx(
            userRankSubmissionsKey(userId, previousPlayerName.toLowerCase()),
            userRankSubmissionsKey(
              userId,
              maybeFormattedPlayerName.toLowerCase(),
            ),
          );
        }
      } else {
        // No name change, just update the player record
        await updatePlayer(previousPlayerName, {
          rank: currentRank,
          isMobileOnly,
          updatedAt: new Date(),
        });
      }

      await pipeline.exec();

      // Return the final player name (potentially updated)
      return { playerName: maybeFormattedPlayerName };
    },
  );
