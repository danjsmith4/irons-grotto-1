'use server';

import { z } from 'zod';
import { userRankSubmissionsKey } from '@/config/redis';
import { redis } from '@/redis';
import { authActionClient } from '@/app/safe-action';
import { returnValidationErrors } from 'next-safe-action';
import { PlayerName } from '@/app/schemas/player';
import { Rank } from '@/config/enums';
import { fetchPlayerMeta } from '../../../../data-sources/fetch-player-meta';
import { fetchTemplePlayerInfo } from '../../../../data-sources/fetch-temple-player-info';
import { assertUniquePlayerRecord } from '../../../validation/assert-unique-player-record';
import { resolveTempleAccountType } from '@/app/schemas/temple-api';
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

      const [playerMeta, templeInfo] = await Promise.all([
        fetchPlayerMeta(playerName),
        fetchTemplePlayerInfo(playerName),
      ]);

      const maybeFormattedPlayerName = playerMeta?.rsn ?? playerName;

      // If the player name has changed, validate that the new player is an ironman
      const hasPlayerNameChanged =
        maybeFormattedPlayerName.toLowerCase() !==
        previousPlayerName.toLowerCase();

      // A rename points the record at a different account, so its game mode is
      // re-resolved. Temple reporting a main is not grounds to reject — it
      // reports group ironmen it has never been told about the same way — so
      // an unresolvable account is cleared to null instead, and the calculator
      // asks its owner.
      const renamedAccountType = hasPlayerNameChanged
        ? ((templeInfo &&
            resolveTempleAccountType(
              templeInfo['Game mode'],
              templeInfo.GIM,
            )) ??
          null)
        : undefined;

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
              accountType: renamedAccountType,
              gimGroupName: renamedAccountType ? undefined : null,
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
