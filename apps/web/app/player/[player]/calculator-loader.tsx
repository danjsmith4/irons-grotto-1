'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Text } from '@radix-ui/themes';
import { NavBar } from '@/app/components/nav-bar';
import type { SessionContext } from '@/app/data-sources/fetch-session-context';
import { playerDetailsQueryOptions } from '../hooks/use-player-details';
import { FormWrapper } from './form-wrapper';
import styles from '../components/rank-calculator.module.css';

interface CalculatorLoaderProps {
  playerName: string;
  session: SessionContext;
}

/**
 * Mounts the calculator as soon as the player's sheet is available — from the
 * cache if the dashboard already warmed it, otherwise over the network.
 *
 * ⚠️ **This used to be an `await` in the server component**, which meant every
 * visit paid the full source sync before Next would send anything but
 * `loading.tsx`. Nothing about that work got cheaper by moving it; what changed
 * is *when* it can start. Fetching it from the client is what lets the dashboard
 * begin it minutes early (`PreloadCalculatorData`), and what lets this page put
 * its own chrome on screen while it finishes.
 *
 * The form is mounted only once the data is here, never re-keyed on a later
 * one: `useForm` reads `defaultValues` once, and swapping them under a member
 * mid-edit would discard what they had typed.
 */
export function CalculatorLoader({
  playerName,
  session,
}: CalculatorLoaderProps) {
  const router = useRouter();
  const { data, isPending, isFetching, isStale } = useQuery(
    playerDetailsQueryOptions(playerName),
  );
  /**
   * Latches the moment the form goes up, so it can never be swapped back for
   * the skeleton. The form owns the member's in-progress edits from then on;
   * unmounting it to show a loading state would throw them away.
   */
  const formMounted = useRef(false);

  // A name that no longer resolves on the hiscores sends the member to the edit
  // page. `fetchPlayerDetails` decides that; over HTTP it arrives as data, so
  // the navigation happens here.
  const redirectTo = data && !data.success ? data.redirectTo : undefined;

  useEffect(() => {
    if (redirectTo) {
      router.replace(redirectTo);
    }
  }, [redirectTo, router]);

  /*
   * A cached sheet is only mounted while it is still fresh. Past `staleTime`
   * the cache is a starting point for the refetch, not an answer: seeding the
   * form from it would put an old snapshot on screen that nothing later
   * corrects, since `defaultValues` are read once. So a stale hit waits, the
   * same as a cold one — which in practice it never is, because the dashboard
   * warms this seconds before the click.
   */
  const waitingForSheet = isPending || (isFetching && isStale);

  if (!formMounted.current && (waitingForSheet || redirectTo)) {
    return <CalculatorSkeleton playerName={playerName} session={session} />;
  }

  if (!data?.success) {
    return (
      <Chrome playerName={playerName} session={session}>
        <Text as="p" className={styles.loadError}>
          {data?.error ?? 'An error occurred'}
        </Text>
      </Chrome>
    );
  }

  const {
    currentRank,
    hasTemplePlayerStats,
    hasWikiSyncData,
    hasThirdPartyData,
    hasTempleCollectionLog,
    isTempleCollectionLogOutdated,
    isMobileOnly,
    joinDate,
    ...rest
  } = data.data;

  formMounted.current = true;

  return (
    <FormWrapper
      // `joinDate` is the one field that does not survive JSON as itself.
      formData={{ ...rest, joinDate: new Date(joinDate) }}
      currentRank={currentRank}
      playerName={playerName}
      userCalculators={session.accounts}
      session={session}
      warnings={{
        templeCollectionLogNotFound: !isMobileOnly && !hasTempleCollectionLog,
        templeCollectionLogOutdated:
          !isMobileOnly && isTempleCollectionLogOutdated,
        wikiSyncNotFound: !isMobileOnly && !hasWikiSyncData,
      }}
    />
  );
}

/**
 * The page around the sheet, drawn from data the server already had.
 *
 * `showCalculatorActions` is off, because there is no form to act on yet — and
 * that is also why this nav bar is a separate subtree from the one
 * `FormWrapper` renders rather than one bar with a changing prop: the flag
 * decides how many hooks `NavBar` calls, so flipping it in place would be a
 * hook-count change on an already-mounted component.
 */
function Chrome({
  playerName,
  session,
  children,
}: CalculatorLoaderProps & { children: React.ReactNode }) {
  return (
    <div
      style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}
    >
      <NavBar
        currentPage="player"
        playerName={playerName}
        userCalculators={session.accounts}
        viewerStaffRole={session.staffRole}
        events={session.events}
      />
      <div style={{ flex: 1 }}>{children}</div>
    </div>
  );
}

/**
 * The page's own shapes, held empty.
 *
 * A full-screen spinner (what `loading.tsx` gives) says only "wait"; the
 * scoreboard-then-tiles-then-workbench outline says *what* is coming and stops
 * the layout jumping when it lands. It is only ever seen on a cold load — from
 * the dashboard the sheet is already cached and the form mounts on the first
 * paint.
 */
function CalculatorSkeleton({ playerName, session }: CalculatorLoaderProps) {
  return (
    <Chrome playerName={playerName} session={session}>
      <div className={styles.page} aria-busy="true" aria-live="polite">
        <div className={styles.scoreboard}>
          <div className={styles.skeletonScore}>
            <div className={`${styles.skeleton} ${styles.skeletonBadge}`} />
            <div className={styles.skeletonIdentity}>
              <div className={`${styles.skeleton} ${styles.skeletonName}`} />
              <div className={`${styles.skeleton} ${styles.skeletonTrack}`} />
            </div>
            <div className={`${styles.skeleton} ${styles.skeletonTotal}`} />
          </div>
          <div className={`${styles.skeleton} ${styles.skeletonMeter}`} />
        </div>
        <div className={styles.panelGrid}>
          {[0, 1, 2, 3].map((tile) => (
            <div
              key={tile}
              className={`${styles.skeleton} ${styles.skeletonTile}`}
            />
          ))}
        </div>
        <div className={`${styles.skeleton} ${styles.skeletonWorkbench}`} />
        <span className={styles.srOnly}>Loading {playerName}&apos;s sheet</span>
      </div>
    </Chrome>
  );
}
