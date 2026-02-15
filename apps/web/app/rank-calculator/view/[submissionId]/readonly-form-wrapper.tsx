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
  actionedByUsername: string | null;
}

export function ReadonlyFormWrapper({
  formData,
  userPermissions,
  diffErrors,
  submissionMetadata,
  actionedByUsername,
}: FormWrapperProps) {
  const isModerator = userCanModerateSubmission(userPermissions);

  const methods = useForm<Omit<RankCalculatorSchema, 'rank' | 'points'>>({
    disabled: true,
    defaultValues: formData,
    errors: isModerator ? diffErrors : {},
  });

  return (
    <ModerationProvider
      isModerator={isModerator}
      hasTemplePlayerStats={submissionMetadata.hasTemplePlayerStats}
      hasTempleCollectionLog={submissionMetadata.hasTempleCollectionLog}
      hasWikiSyncData={submissionMetadata.hasWikiSyncData}
      actionedByUsername={actionedByUsername}
      isTempleCollectionLogOutdated={
        submissionMetadata.isTempleCollectionLogOutdated
      }
      playerName={formData.playerName}
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
