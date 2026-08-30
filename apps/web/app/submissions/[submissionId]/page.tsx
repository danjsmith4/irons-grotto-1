import { Flex, Heading } from '@radix-ui/themes';
import { auth } from '@/auth';
import { RankSubmissionMetadata } from '@/app/schemas/rank-calculator';
import {
  dehydrate,
  HydrationBoundary,
  QueryClient,
} from '@tanstack/react-query';
import { fetchSessionContext } from '@/app/data-sources/fetch-session-context';
import { ReadonlyFormWrapper } from './readonly-form-wrapper';
import { fetchPlayerDetails } from '@/app/player/data-sources/fetch-player-details/fetch-player-details';
import { calculateDiffErrors } from './utils/calculate-diff-errors';
import { getRankSubmission } from '@/lib/db/submission-operations';
import {
  parseDiff,
  parseSnapshot,
} from '@/app/schemas/rank-submission-snapshot';
import { getDiscordUsername } from './get-discord-username';
import {
  fetchItemDropRates,
  generateRequiredItemList,
} from '@/app/player/data-sources/fetch-dropped-item-info';
import { buildNotableItemList } from '@/app/player/utils/build-notable-item-list';

export default async function ViewSubmissionPage({
  params,
}: {
  params: Promise<{ submissionId: string }>;
}) {
  const { submissionId } = await params;
  const row = await getRankSubmission(submissionId);

  if (!row) {
    return (
      <Flex align="center" justify="center" height="100vh">
        <Heading>404 submission not found</Heading>
      </Flex>
    );
  }

  // Parsed with the pinned V1 schema rather than the live calculator schema, so
  // a change to the form's shape cannot retroactively break an old submission.
  const submission = parseSnapshot(row.snapshot);
  const submissionDiff = parseDiff(row.diff);

  if (!submission || !submissionDiff) {
    throw new Error('Unable to read submission data');
  }

  // The three Redis keys this page used to read are now columns on one row.
  const submissionMetadata = {
    status: (row.status.charAt(0).toUpperCase() +
      row.status.slice(1)) as RankSubmissionMetadata['status'],
    discordMessageId: row.discordMessageId,
    submittedBy: row.submittedByDiscordId,
    submittedAt: row.submittedAt,
    actionedBy: row.actionedByDiscordId,
    hasTemplePlayerStats: row.hasTemplePlayerStats,
    hasTempleCollectionLog: row.hasTempleCollectionLog,
    hasWikiSyncData: row.hasWikiSyncData,
    isTempleCollectionLogOutdated: row.isTempleCollectionLogOutdated,
    automaticApproval: row.isAutomatic,
  } satisfies RankSubmissionMetadata;

  const user = await auth();

  const diffErrors = calculateDiffErrors(submissionDiff);

  const actionedByUsername = await getDiscordUsername(
    submissionMetadata.actionedBy,
  );

  // Fetch fresh player details to compare with stored metadata
  // This ensures the UI shows current moderation status, not stale data
  let freshModerationData = null;
  if (user?.user?.id) {
    try {
      const freshDetails = await fetchPlayerDetails(
        submission.playerName,
        user.user.id,
      );
      if (freshDetails.success) {
        freshModerationData = {
          hasTemplePlayerStats: freshDetails.data.hasTemplePlayerStats,
          hasTempleCollectionLog: freshDetails.data.hasTempleCollectionLog,
          hasWikiSyncData: freshDetails.data.hasWikiSyncData,
          isTempleCollectionLogOutdated:
            freshDetails.data.isTempleCollectionLogOutdated,
        };
      }
    } catch (error) {
      console.warn('Failed to fetch fresh moderation data:', error);
    }
  }

  const queryClient = new QueryClient();

  const [dropRates, session] = await Promise.all([
    fetchItemDropRates([...generateRequiredItemList()]),
    fetchSessionContext(),
  ]);
  const notableItemList = await buildNotableItemList(dropRates);

  queryClient.setQueryData(['drop-rates'], dropRates);
  queryClient.setQueryData(['items'], Object.entries(notableItemList));

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <ReadonlyFormWrapper
        formData={submission}
        userPermissions={user?.user?.permissions}
        diffErrors={diffErrors}
        submissionMetadata={submissionMetadata}
        freshModerationData={freshModerationData}
        actionedByUsername={actionedByUsername}
        session={session}
      />
    </HydrationBoundary>
  );
}
