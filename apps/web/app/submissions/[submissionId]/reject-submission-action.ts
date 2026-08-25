'use server';

import { authActionClient } from '@/app/safe-action';
import { discordBotClient } from '@/discord';
import { Routes } from 'discord-api-types/v10';
import { serverConstants } from '@/config/constants.server';
import dedent from 'dedent';
import * as Sentry from '@sentry/node';
import { ActionError } from '@/app/action-error';
import { claimRankSubmission } from '@/lib/db/submission-operations';
import { userCanModerateSubmission } from './utils/user-can-moderate-submission';
import { sendDiscordMessage } from '@/app/player/utils/send-discord-message';
import { RejectSubmissionSchema } from './moderate-submission-schema';

export const rejectSubmissionAction = authActionClient
  .metadata({ actionName: 'reject-submission' })
  .schema(RejectSubmissionSchema)
  .action(
    async ({ parsedInput: { submissionId }, ctx: { permissions, userId } }) => {
      if (!userCanModerateSubmission(permissions)) {
        throw new ActionError(
          'You do not have permission to reject this submission',
        );
      }

      // Claimed first, and Discord only after. Two moderators rejecting at once
      // both used to pass the status check and both messaged the member.
      const rejected = await claimRankSubmission(submissionId, {
        status: 'rejected',
        actionedByDiscordId: userId,
      });

      if (!rejected) {
        throw new ActionError('Submission does not need to be moderated!');
      }

      const messageId = rejected.discordMessageId;
      const submitterId = rejected.submittedByDiscordId;

      // The rejection has committed; Discord failing cannot un-reject it, so
      // the outcome is reported rather than rolled back.
      try {
        await discordBotClient.put(
          Routes.channelMessageOwnReaction(
            serverConstants.discord.channelId,
            messageId,
            encodeURIComponent('❌'),
          ),
        );

        await sendDiscordMessage(
          {
            content: dedent`
            <@${submitterId}>

            Your application has been rejected by <@${userId}>.

            Please reach out if you have any questions.
          `,
          },
          messageId,
        );
      } catch (error) {
        Sentry.captureException(error);

        return { success: true, discord: 'failed' as const };
      }

      return { success: true, discord: 'synced' as const };
    },
  );
