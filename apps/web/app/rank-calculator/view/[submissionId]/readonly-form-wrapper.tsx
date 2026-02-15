'use client';

import { FieldErrors, FormProvider, useForm } from 'react-hook-form';
import {
  RankSubmissionMetadata,
} from '@/app/schemas/rank-calculator';
import { RankCalculator } from '../../[player]/rank-calculator';
import { RankCalculatorSchema } from '../../[player]/submit-rank-calculator-validation';
import { userCanModerateSubmission } from './utils/user-can-moderate-submission';
import { ModerationProvider } from '../../contexts/moderation-context';

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
    >
      <FormProvider {...methods}>
        <RankCalculator submitRankCalculatorAction={undefined} />
      </FormProvider>
    </ModerationProvider>
  );
}
