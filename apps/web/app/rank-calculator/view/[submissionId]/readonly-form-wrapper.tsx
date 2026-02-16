'use client';

import { FieldErrors, FormProvider, useForm } from 'react-hook-form';
import { RankSubmissionMetadata } from '@/app/schemas/rank-calculator';
import { RankCalculator } from '../../[player]/rank-calculator';
import { RankCalculatorSchema } from '../../[player]/submit-rank-calculator-validation';
import { userCanModerateSubmission } from './utils/user-can-moderate-submission';
import { ModerationProvider } from '../../contexts/moderation-context';
import { NavBar } from '@/app/components/nav-bar';
import { SubmissionNavbarActions } from './components/submission-navbar-actions';

interface FormWrapperProps {
  formData: Omit<RankCalculatorSchema, 'rank' | 'points'>;
  userPermissions: string | undefined;
  diffErrors: FieldErrors;
  submissionMetadata: RankSubmissionMetadata;
  freshModerationData: {
    hasTemplePlayerStats: boolean;
    hasTempleCollectionLog: boolean;
    hasWikiSyncData: boolean;
    isTempleCollectionLogOutdated: boolean;
  } | null;
  actionedByUsername: string | null;
}

export function ReadonlyFormWrapper({
  formData,
  userPermissions,
  diffErrors,
  submissionMetadata,
  freshModerationData,
  actionedByUsername,
}: FormWrapperProps) {
  const isModerator = userCanModerateSubmission(userPermissions);

  // Use fresh moderation data if available, otherwise fall back to stored metadata
  const moderationData = freshModerationData ?? {
    hasTemplePlayerStats: submissionMetadata.hasTemplePlayerStats,
    hasTempleCollectionLog: submissionMetadata.hasTempleCollectionLog,
    hasWikiSyncData: submissionMetadata.hasWikiSyncData,
    isTempleCollectionLogOutdated:
      submissionMetadata.isTempleCollectionLogOutdated,
  };

  // Calculate data freshness info to show when status has changed
  const dataFreshnessInfo = freshModerationData
    ? {
        isUsingFreshData: true,
        hasTempleCollectionLogStatusChanged:
          freshModerationData.isTempleCollectionLogOutdated !==
          submissionMetadata.isTempleCollectionLogOutdated,
        hasOtherDataChanged:
          freshModerationData.hasTemplePlayerStats !==
            submissionMetadata.hasTemplePlayerStats ||
          freshModerationData.hasTempleCollectionLog !==
            submissionMetadata.hasTempleCollectionLog ||
          freshModerationData.hasWikiSyncData !==
            submissionMetadata.hasWikiSyncData,
      }
    : {
        isUsingFreshData: false,
        hasTempleCollectionLogStatusChanged: false,
        hasOtherDataChanged: false,
      };

  const methods = useForm<Omit<RankCalculatorSchema, 'rank' | 'points'>>({
    disabled: true,
    defaultValues: formData,
    errors: isModerator ? diffErrors : {},
  });

  return (
    <ModerationProvider
      isModerator={isModerator}
      hasTemplePlayerStats={moderationData.hasTemplePlayerStats}
      hasTempleCollectionLog={moderationData.hasTempleCollectionLog}
      hasWikiSyncData={moderationData.hasWikiSyncData}
      actionedByUsername={actionedByUsername}
      isTempleCollectionLogOutdated={
        moderationData.isTempleCollectionLogOutdated
      }
      playerName={formData.playerName}
      dataFreshnessInfo={dataFreshnessInfo}
    >
      <FormProvider {...methods}>
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <NavBar
            currentPage="submission"
            playerName={formData.playerName}
            additionalButtons={
              <SubmissionNavbarActions
                playerName={formData.playerName}
                initialStatus={submissionMetadata.status}
                userCanModerate={isModerator}
              />
            }
          />
          <div style={{ flex: 1 }}>
            <RankCalculator submitRankCalculatorAction={undefined} />
          </div>
        </div>
      </FormProvider>
    </ModerationProvider>
  );
}
