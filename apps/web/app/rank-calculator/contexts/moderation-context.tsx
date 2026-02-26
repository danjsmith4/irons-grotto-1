import { RankSubmissionMetadata } from '@/app/schemas/rank-calculator';
import { createContext, PropsWithChildren, useContext, useMemo } from 'react';

interface ModerationProps
  extends Pick<
    RankSubmissionMetadata,
    | 'hasTemplePlayerStats'
    | 'hasWikiSyncData'
    | 'hasTempleCollectionLog'
    | 'isTempleCollectionLogOutdated'
  > {
  isModerator: boolean;
  actionedByUsername: string | null;
  playerName: string;
  // Track whether moderation data has changed since submission creation
  dataFreshnessInfo?: {
    isUsingFreshData: boolean;
    hasTempleCollectionLogStatusChanged: boolean;
    hasOtherDataChanged: boolean;
  };
}

export const ModerationContext = createContext<ModerationProps>({
  actionedByUsername: '',
  hasTemplePlayerStats: false,
  hasTempleCollectionLog: false,
  hasWikiSyncData: false,
  isModerator: false,
  isTempleCollectionLogOutdated: false,
  playerName: '',
  dataFreshnessInfo: undefined,
});

export function ModerationProvider({
  children,
  isModerator,
  hasTemplePlayerStats,
  hasTempleCollectionLog,
  hasWikiSyncData,
  actionedByUsername,
  isTempleCollectionLogOutdated,
  playerName,
  dataFreshnessInfo,
}: PropsWithChildren<ModerationProps>) {
  const value = useMemo<ModerationProps>(
    () => ({
      isModerator,
      hasTemplePlayerStats,
      hasTempleCollectionLog,
      hasWikiSyncData,
      actionedByUsername,
      isTempleCollectionLogOutdated,
      playerName,
      dataFreshnessInfo,
    }),
    [
      isModerator,
      hasTempleCollectionLog,
      hasTemplePlayerStats,
      hasWikiSyncData,
      actionedByUsername,
      isTempleCollectionLogOutdated,
      playerName,
      dataFreshnessInfo,
    ],
  );

  return (
    <ModerationContext.Provider value={value}>
      {children}
    </ModerationContext.Provider>
  );
}

export function useModeration() {
  const context = useContext(ModerationContext);

  if (!context) {
    throw new Error('useModeration must be used inside ModerationContext');
  }

  return context;
}
