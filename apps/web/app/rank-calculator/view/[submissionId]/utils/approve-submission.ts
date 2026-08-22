import { ActionError } from '@/app/action-error';
import { serverConstants } from '@/config/constants.server';
import type { achievementDiscordRoles } from '@/config/discord-roles';
import { discordBotClient } from '@/discord';
import { Routes } from 'discord-api-types/v10';
import {
  approveRankSubmission,
  getRankSubmission,
} from '@/lib/db/submission-operations';
import { Rank } from '@/config/enums';
import {
  parseDiff,
  parseSnapshot,
} from '@/app/schemas/rank-submission-snapshot';
import { assignRankDiscordRole } from './assign-rank-discord-role';
import { assignAchievementDiscordRoles } from './assign-achievement-discord-roles';
import { sendDiscordMessage } from '@/app/rank-calculator/utils/send-discord-message';
import dedent from 'dedent';
import { getRankName } from '@/app/rank-calculator/utils/get-rank-name';
import * as Sentry from '@sentry/node';

/**
 * Note the absence of `rank`. It used to be passed in — which meant the client
 * told the server which rank to grant, and the server took its word. It is now
 * read from the submission row, where it was recorded when the member applied.
 */
type ApproveSubmissionInput = {
  submissionId: string;
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
  approverId,
  isAutomatic = false,
}: ApproveSubmissionInput) {
  const submission = await getRankSubmission(submissionId);

  if (!submission) {
    throw new ActionError('Unable to find submission');
  }

  const snapshot = parseSnapshot(submission.snapshot);
  const submissionDiff = parseDiff(submission.diff);

  if (!snapshot || !submissionDiff) {
    throw new ActionError('Unable to read submission data for application');
  }

  // Stored as a varchar; narrowed back here so the Discord helpers, which are
  // keyed by rank, keep their exhaustiveness.
  const rank = Rank.safeParse(submission.rank);

  if (!rank.success) {
    // Only possible for a submission backfilled out of Redis, where the applied
    // rank was never recorded anywhere but the Discord embed.
    throw new ActionError(
      'This submission predates rank tracking and must be actioned manually.',
    );
  }

  const approvedRank = rank.data;

  const messageId = submission.discordMessageId;
  const submitterId = submission.submittedByDiscordId;
  const hasWikiSyncData = submission.hasWikiSyncData;
  const combatAchievementTier = snapshot.combatAchievementTier;
  const isBloodTorvaChecked = snapshot.hasBloodTorva;

  const {
    combatAchievementTier: combatAchievementTierDiscrepancy,
    hasBloodTorva: hasBloodTorvaDiscrepancy,
  } = submissionDiff;

  // If the player has WikiSync data available and has the Grandmaster CA tier,
  // they can be assigned the Grandmaster role.
  const isVerifiedGrandmaster =
    hasWikiSyncData &&
    combatAchievementTier === 'Grandmaster' &&
    !combatAchievementTierDiscrepancy;

  // If the player has WikiSync data available and has the Ancient blood ornament kit,
  // they can be assigned the Blood Torva role.
  // This item is based on multiple combat achievements that are available via WikiSync.
  const hasVerifiedAncientBloodOrnamentKit =
    hasWikiSyncData && isBloodTorvaChecked && !hasBloodTorvaDiscrepancy;

  const applicableAchievementDiscordRoles = {
    'Blood Torva': hasVerifiedAncientBloodOrnamentKit,
    Grandmaster: isVerifiedGrandmaster,
  } satisfies Record<keyof typeof achievementDiscordRoles, boolean>;

  const requiresAchievementRoles = Object.values(
    applicableAchievementDiscordRoles,
  ).some(Boolean);

  const actionedBy = isAutomatic ? null : (approverId ?? null);

  if (!isAutomatic && !actionedBy) {
    Sentry.captureException('Unable to determine actionedBy for approval');

    throw new ActionError('Something went wrong while approving submission');
  }

  // Claim the submission and move the rank in one transaction, *before* any
  // Discord side effect. Whoever loses this race gets null and stops, instead
  // of assigning a second set of roles over the top of the first.
  const approval = await approveRankSubmission(submissionId, {
    actionedByDiscordId: actionedBy,
    isAutomatic,
  });

  if (!approval) {
    throw new ActionError('Submission does not need to be moderated!');
  }

  // Discord only after the approval has committed. The database is what grants
  // the rank, so an outage here cannot un-grant it — the outcome is reported
  // rather than rolled back, matching how staff-role changes already behave.
  try {
    await discordBotClient.put(
      Routes.channelMessageOwnReaction(
        serverConstants.discord.channelId,
        messageId,
        encodeURIComponent('☑️'),
      ),
    );
    await assignRankDiscordRole(approvedRank, submitterId);

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

          ${[getRankName(approvedRank), ...newAchievementRoles.filter(Boolean)]
            .map((role) => `- ${role}`)
            .join('\n')}

          Please reach out to any member of staff to update your in-game rank!
        `,
      },
      messageId,
    );
  } catch (error) {
    Sentry.captureException(error);

    return { success: true, discord: 'failed' as const };
  }

  return { success: true, discord: 'synced' as const };
}
