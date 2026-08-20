'use client';

import { FormProvider } from 'react-hook-form';
import { useHookFormAction } from '@next-safe-action/adapter-react-hook-form/hooks';
import { zodResolver } from '@hookform/resolvers/zod';
import { Rank } from '@/config/enums';
import { toast } from 'react-toastify';
import { useEffect } from 'react';
import { RankCalculator } from './rank-calculator';
import {
  RankCalculatorSchema,
  RankCalculatorValidator,
} from './submit-rank-calculator-validation';
import { saveDraftRankSubmissionAction } from './actions/save-draft-rank-submission-action';
import { handleToastUpdates } from '../utils/handle-toast-updates';
import { CurrentPlayerProvider } from '../contexts/current-player-context';
import { NavBar } from '@/app/components/nav-bar';
import { Player } from '@/app/schemas/player';

/** How long the RuneLite-plugin warnings stay up before dismissing themselves. */
const pluginWarningDuration = 3000;

interface FormWrapperProps {
  formData: Omit<RankCalculatorSchema, 'rank' | 'points'>;
  currentRank?: Rank;
  playerName: string;
  userCalculators: Record<string, Player>;
  warnings: {
    templeCollectionLogNotFound: boolean;
    templeCollectionLogOutdated: boolean;
    wikiSyncNotFound: boolean;
  };
}

export function FormWrapper({
  formData,
  currentRank,
  playerName,
  userCalculators,
  warnings,
}: FormWrapperProps) {
  const {
    form,
    action: {
      executeAsync: saveDraftRankSubmission,
      isExecuting,
      isTransitioning,
    },
  } = useHookFormAction(
    saveDraftRankSubmissionAction,
    zodResolver(RankCalculatorValidator),
    {
      formProps: {
        defaultValues: formData,
        criteriaMode: 'all',
        mode: 'onBlur',
      },
    },
  );

  // Custom save function with rank validation
  const submitRankCalculator = form.handleSubmit(async (data) => {
    try {
      const result = await handleToastUpdates(saveDraftRankSubmission(data), {
        pending: 'Saving draft...',
        success: {
          render() {
            form.reset(data, { keepIsSubmitSuccessful: true });

            return 'Draft saved!';
          },
        },
      });
      return result;
    } catch (error) {
      console.error('Save failed:', error);
      throw error;
    }
  });

  // Each warning carries a stable `toastId` so it can only ever be on screen
  // once: the effect runs more than once per visit (React re-mounts it in
  // development, and any re-mount of the form does the same), which stacked a
  // second identical copy of every warning.
  //
  // They also clear themselves. They used to sit there until dismissed by hand,
  // which is a lot of chrome for advice that does not change — the container's
  // close button and `pauseOnHover` are still there for anyone mid-read.
  useEffect(() => {
    if (warnings.templeCollectionLogOutdated) {
      toast.warning(
        'Please sync your collection log via the TempleOSRS RuneLite plugin!',
        {
          autoClose: pluginWarningDuration,
          toastId: 'temple-collection-log-outdated',
        },
      );
    }

    if (warnings.templeCollectionLogNotFound) {
      toast.warning(
        'Please install the TempleOSRS RuneLite plugin to enable automatic notable item tracking!',
        {
          autoClose: pluginWarningDuration,
          toastId: 'temple-collection-log-not-found',
        },
      );
    }

    if (warnings.wikiSyncNotFound) {
      toast.warning(
        'Please install the WikiSync RuneLite plugin to enable automatic tracking of CAs and diaries!',
        {
          autoClose: pluginWarningDuration,
          toastId: 'wiki-sync-not-found',
        },
      );
    }
  }, [
    warnings.templeCollectionLogOutdated,
    warnings.templeCollectionLogNotFound,
    warnings.wikiSyncNotFound,
  ]);

  return (
    <CurrentPlayerProvider rank={currentRank} playerName={formData.playerName}>
      <FormProvider {...form}>
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <NavBar
            currentPage="player"
            playerName={playerName}
            userCalculators={userCalculators}
            showSaveActions={true}
            onSave={() => saveDraftRankSubmission(form.getValues())}
            isSaving={
              isExecuting || isTransitioning || form.formState.isSubmitting
            }
            canSave={form.formState.isValid}
            isActionActive={
              isExecuting || isTransitioning || form.formState.isSubmitting
            }
            submitForm={submitRankCalculator}
          />
          <div style={{ flex: 1 }}>
            <RankCalculator submitRankCalculatorAction={submitRankCalculator} />
          </div>
        </div>
      </FormProvider>
    </CurrentPlayerProvider>
  );
}
