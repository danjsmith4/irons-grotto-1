'use client';

import { FormProvider, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Rank } from '@/config/enums';
import { toast } from 'react-toastify';
import { useCallback, useEffect } from 'react';
import { RankCalculator } from './rank-calculator';
import {
  RankCalculatorSchema,
  RankCalculatorValidator,
} from './submit-rank-calculator-validation';
import { updatePlayerStateAction } from './actions/update-player-state-action';
import { PlayerEditableFields } from './player-editable-schema';
import { useAutosave } from '../hooks/use-autosave';
import { CurrentPlayerProvider } from '../contexts/current-player-context';
import { NavBar } from '@/app/components/nav-bar';
import type { NavContext } from '@/app/data-sources/fetch-nav-context';
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
  /** Threaded straight to the nav bar so its chrome does not pop in. */
  navContext: NavContext;
}

export function FormWrapper({
  formData,
  currentRank,
  playerName,
  userCalculators,
  warnings,
  navContext,
}: FormWrapperProps) {
  const form = useForm<Omit<RankCalculatorSchema, 'rank' | 'points'>>({
    resolver: zodResolver(RankCalculatorValidator),
    defaultValues: formData,
    criteriaMode: 'all',
    mode: 'onBlur',
  });

  const save = useCallback(
    async (patch: PlayerEditableFields) => {
      // Bound args come first: the action is bound to the player name, and
      // takes the patch as its input.
      const result = await updatePlayerStateAction(playerName, patch);

      return Boolean(result?.data?.success);
    },
    [playerName],
  );

  // A failed write is the only thing worth interrupting for. Success is
  // silent — a toast every 800ms would be intolerable, and "your edit
  // applied" is not news.
  const onAutosaveError = useCallback(() => {
    toast.error("Your latest change didn't go through. Retrying…", {
      toastId: 'autosave-failed',
    });
  }, []);

  const { flushNow } = useAutosave({
    form,
    save,
    onError: onAutosaveError,
  });

  // "Apply for promotion" needs whatever is on screen to be stored first —
  // which used to be spelled as a dirty check and a "save your data first!"
  // toast. Now it just waits for the write.
  const submitRankCalculator = useCallback(async () => {
    await flushNow();
  }, [flushNow]);

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
            showCalculatorActions
            beforeSubmit={flushNow}
            {...navContext}
          />
          <div style={{ flex: 1 }}>
            <RankCalculator submitRankCalculatorAction={submitRankCalculator} />
          </div>
        </div>
      </FormProvider>
    </CurrentPlayerProvider>
  );
}
