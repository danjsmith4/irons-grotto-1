'use client';

import { useState } from 'react';
import { Flex } from '@radix-ui/themes';
import { RankSubmissionStatus } from '@/app/schemas/rank-calculator';
import { ApproveSubmissionButton } from './approve-submission-button';
import { RejectSubmissionButton } from './reject-submission-button';

interface SubmissionNavbarActionsProps {
  playerName: string;
  initialStatus: RankSubmissionStatus;
  userCanModerate: boolean;
}

export function SubmissionNavbarActions({
  playerName,
  initialStatus,
  userCanModerate,
}: SubmissionNavbarActionsProps) {
  const [submissionStatus, setSubmissionStatus] = useState(initialStatus);

  if (!userCanModerate || submissionStatus !== 'Pending') {
    return null;
  }

  return (
    <Flex gap="2">
      <RejectSubmissionButton
        onRejectSuccess={() => {
          setSubmissionStatus('Rejected');
        }}
      />
      <ApproveSubmissionButton
        onApproveSuccess={() => {
          setSubmissionStatus('Approved');
        }}
        playerName={playerName}
      />
    </Flex>
  );
}
