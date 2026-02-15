import { ActionError } from '@/app/action-error';
import type { CombatAchievementTier } from '@/app/schemas/osrs';
import type {
  RankStructure,
  RankSubmissionDiff,
  RankSubmissionStatus,
} from '@/app/schemas/rank-calculator';
import { serverConstants } from '@/config/constants.server';
import type { achievementDiscordRoles } from '@/config/discord-roles';
import {
  rankSubmissionDiffKey,
  rankSubmissionKey,
  rankSubmissionMetadataKey,
} from '@/config/redis';
import { discordBotClient } from '@/discord';
import { redis, redisRaw } from '@/redis';
import { Routes } from 'discord-api-types/v10';
import { assignRankDiscordRole } from './assign-rank-discord-role';
import { assignAchievementDiscordRoles } from './assign-achievement-discord-roles';
import { sendDiscordMessage } from '@/app/rank-calculator/utils/send-discord-message';
import dedent from 'dedent';
import { getRankName } from '@/app/rank-calculator/utils/get-rank-name';
import type { Rank } from '@/config/enums';
import * as Sentry from '@sentry/node';
import { db } from '@/lib/db';
import { playerRankUps, players } from '@/lib/db/schema';
import { getPlayerByName } from '@/lib/db/player-operations';
import { eq } from 'drizzle-orm';

type ApproveSubmissionInput = {
  submissionId: string;
  rank: Rank;
} & (
  | {
      approverId: string;
      isAutomatic?: false;
    }
  | {
      approverId?: never;
      isAutomatic: true;
    }
);

export async function approveSubmission({
  submissionId,
  rank,
  approverId,
  isAutomatic = false,
}: ApproveSubmissionInput) {
  const metadata = (await redisRaw.hmget(
    rankSubmissionMetadataKey(submissionId),
    'status',
    'discordMessageId',
    'submittedBy',
    'hasWikiSyncData',
  )) as unknown as [RankSubmissionStatus, string, string, string];

  if (!metadata) {
    throw new ActionError('Unable to find submission metadata');
  }

  const [submissionStatus, messageId, submitterId, hasWikiSyncData] = metadata;

  if (submissionStatus !== 'Pending') {
    throw new ActionError('Submission does not need to be moderated!');
  }

  const submissionData = await redis.json.get<{
    '$.playerName': [string];
    '$.rankStructure': [RankStructure];
    '$.combatAchievementTier': [CombatAchievementTier];
    '$.hasBloodTorva': [boolean];
  }>(
    rankSubmissionKey(submissionId),
    '$.rankStructure',
    '$.playerName',
    '$.combatAchievementTier',
    '$.hasBloodTorva',
  );

  if (!submissionData) {
    throw new ActionError('Unable to find submission data for application');
  }

  const {
    '$.playerName': [playerName],
    '$.rankStructure': [rankStructure],
    '$.combatAchievementTier': [combatAchievementTier],
    '$.hasBloodTorva': [isBloodTorvaChecked],
  } = submissionData;

  const submissionDiff = await redis.hmget<
    Pick<RankSubmissionDiff, 'combatAchievementTier' | 'hasBloodTorva'>
  >(
    rankSubmissionDiffKey(submissionId),
    'combatAchievementTier',
    'hasBloodTorva',
  );

  if (!submissionDiff) {
    throw new ActionError('Unable to find submission diff for application');
  }

  const {
    combatAchievementTier: combatAchievementTierDiscrepancy,
    hasBloodTorva: hasBloodTorvaDiscrepancy,
  } = submissionDiff;

  // If the player has WikiSync data available and has the Grandmaster CA tier,
  // they can be assigned the Grandmaster role.
  const isVerifiedGrandmaster =
    hasWikiSyncData === 'true' &&
    combatAchievementTier === 'Grandmaster' &&
    !combatAchievementTierDiscrepancy;

  // If the player has WikiSync data available and has the Ancient blood ornament kit,
  // they can be assigned the Blood Torva role.
  // This item is based on multiple combat achievements that are available via WikiSync.
  const hasVerifiedAncientBloodOrnamentKit =
    hasWikiSyncData === 'true' &&
    isBloodTorvaChecked &&
    !hasBloodTorvaDiscrepancy;

  const applicableAchievementDiscordRoles = {
    'Blood Torva': hasVerifiedAncientBloodOrnamentKit,
    Grandmaster: isVerifiedGrandmaster,
  } satisfies Record<keyof typeof achievementDiscordRoles, boolean>;

  const requiresAchievementRoles = Object.values(
    applicableAchievementDiscordRoles,
  ).some(Boolean);

  if (rankStructure === 'Standard') {
    await discordBotClient.put(
      Routes.channelMessageOwnReaction(
        serverConstants.discord.channelId,
        messageId,
        encodeURIComponent('☑️'),
      ),
    );
    await assignRankDiscordRole(rank, submitterId);

    const newAchievementRoles = requiresAchievementRoles
      ? await assignAchievementDiscordRoles(
          submitterId,
          applicableAchievementDiscordRoles,
        )
      : [];

    await sendDiscordMessage(
      {
        content: dedent`
          <@${submitterId}>

          Your application has been ${
            isAutomatic
              ? 'automatically approved'
              : `approved by <@${approverId}>`
          } and you have been assigned the following role(s) on Discord:

          ${[getRankName(rank), ...newAchievementRoles.filter(Boolean)]
            .map((role) => `- ${role}`)
            .join('\n')}

          Please reach out to any member of staff to update your in-game rank!
        `,
      },
      messageId,
    );
  } else {
    if (requiresAchievementRoles) {
      await assignAchievementDiscordRoles(
        submitterId,
        applicableAchievementDiscordRoles,
      );
    }

    await sendDiscordMessage(
      {
        content: dedent`
          <@${submitterId}>

          Your application has been approved by <@${approverId}>.

          Please reach out to a mod or key to update your ranks!
        `,
      },
      messageId,
    );
  }

  const playerRecord = await getPlayerByName(playerName, submitterId);

  if (!playerRecord) {
    throw new ActionError('Unable to find player record!');
  }

  const transaction = redis.multi();

  const actionedBy = isAutomatic ? 'System' : approverId;

  const oldRank = playerRecord.rank;

  if (!actionedBy) {
    Sentry.captureException('Unable to determine actionedBy for approval');

    throw new ActionError('Something went wrong while approving submission');
  }

  transaction.hset<string>(rankSubmissionMetadataKey(submissionId), {
    status: 'Approved',
    actionedBy,
    automaticApproval: isAutomatic ? 'true' : 'false',
  });

  // Note: We no longer update Redis with player data since we're moving to database-only
  // The database transaction below will handle the rank update

  const result = await transaction.exec();

  db.transaction(async (tx) => {
    const user = await tx.query.players.findFirst({
      where: eq(players.playerName, playerName),
    });

    if ((user && user.rank == rank) || oldRank === rank) {
      tx.rollback();
      return { success: true };
    }

    await tx.insert(playerRankUps).values({
      playerName: playerName,
      newRank: rank,
      oldRank: oldRank ?? (user ? user.rank : undefined), // old rank
      createdAt: new Date(),
    });

    await tx
      .update(players)
      .set({
        rank,
      })
      .where(eq(players.playerName, playerName));
  }).catch((e) =>
    console.log(`Error encountered during rank up db modifications ${e}`),
  );

  if (!result) {
    throw new ActionError('Unable to persist approval to database');
  }

  return { success: true };
}
