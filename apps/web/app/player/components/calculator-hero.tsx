import { useEffect, useId, useState } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
import { Button, Dialog, Flex } from '@radix-ui/themes';
import { ArrowRightIcon } from '@radix-ui/react-icons';
import { useAction } from 'next-safe-action/hooks';
import Image from 'next/image';
import { PlayerMeta } from './player-meta';
import { RankPace } from './rank-pace';
import { RankLadderModal } from './rank-ladder-modal';
import { AccountTypeDialog } from './account-type-dialog';
import { StaffBadge } from '@/app/components/staff-badge';
import { AccountTypeBadge } from '@/app/components/account-type-badge';
import { TotalLevelGraceNotice } from '@/app/components/total-level-grace-notice';
import { useRankCalculator } from '../hooks/point-calculator/use-rank-calculator';
import { getRankName } from '../utils/get-rank-name';
import { isRankUp } from '../utils/is-rank-up';
import { canApplyForRank } from '@/config/ranks';
import { getPointsRemainingLabel } from '../utils/get-points-remaining-label';
import { formatNumber } from '../utils/format-number';
import { formatPercentage } from '../utils/format-percentage';
import {
  exactPositionThreshold,
  useClanStanding,
} from '../hooks/use-clan-standing';
import { getRankImageUrl } from '../utils/get-rank-image-url';
import { useCurrentPlayer } from '../contexts/current-player-context';
import { RankCalculatorSchema } from '../[player]/submit-rank-calculator-validation';
import { handleToastUpdates } from '../utils/handle-toast-updates';
import { publishRankSubmissionAction } from '../[player]/actions/publish-rank-submission-action';
import styles from './rank-calculator.module.css';

/**
 * The scoreboard: who the submission is for, what it scores, and how far that
 * is from the next rank. Sticks beneath the nav so the total stays visible
 * while the item workbench scrolls.
 */
export function CalculatorHero() {
  const {
    pointsAwarded,
    pointsAwardedPercentage,
    pointsRemaining,
    nextRank,
    rank,
    throttleReason,
  } = useRankCalculator();
  const { register, setValue, getValues, formState } = useFormContext();
  const { playerName, rank: currentRank } = useCurrentPlayer();
  // The displayed name comes from the submission itself; the context name is
  // what the publish action is bound to.
  const submissionPlayerName = useWatch<RankCalculatorSchema, 'playerName'>({
    name: 'playerName',
  });
  const accountType = useWatch<RankCalculatorSchema, 'accountType'>({
    name: 'accountType',
  });
  const staffRole = useWatch<RankCalculatorSchema, 'staffRole'>({
    name: 'staffRole',
  });
  const totalLevel = useWatch<RankCalculatorSchema, 'totalLevel'>({
    name: 'totalLevel',
  });
  // Whether the game mode still has to be settled. Nothing else in the hero
  // may interrupt until it is: the rank below is read off whichever ladder the
  // account type selects.
  const needsAccountType = !accountType && !formState.disabled;
  const [showRankUpDialog, setShowRankUpDialog] = useState(false);
  const [hasCheckedForRankUp, setHasCheckedForRankUp] = useState(false);
  const standing = useClanStanding();
  const totalId = useId();
  const remainingId = useId();
  const rankName = getRankName(rank);
  const nextRankName = nextRank ? getRankName(nextRank) : 'Max rank';
  const { executeAsync: publishRankSubmission } = useAction(
    publishRankSubmissionAction.bind(null, currentRank, playerName),
  );

  // Announced once, on load, rather than derived — so an edit that crosses a
  // threshold does not pop a dialog mid-session. The check waits for the
  // account type, otherwise a player who turns out to be a main is
  // congratulated on an ironman rank they were never on. `isRankUp` is what
  // keeps staff out of it: their stored rank is an in-game staff rank, on no
  // ladder, so a bare inequality announced a promotion every single load.
  useEffect(() => {
    if (hasCheckedForRankUp || needsAccountType) {
      return;
    }

    setHasCheckedForRankUp(true);
    setShowRankUpDialog(
      canApplyForRank(accountType) &&
        isRankUp(currentRank, rank, accountType ?? null),
    );
  }, [hasCheckedForRankUp, needsAccountType, currentRank, rank, accountType]);

  useEffect(() => {
    if (rank !== getValues('rank')) {
      setValue('rank', rank, {
        shouldDirty: true,
      });
    }
  }, [rank, setValue, getValues]);

  useEffect(() => {
    setValue('points', pointsAwarded, {
      shouldDirty: true,
    });
  }, [pointsAwarded, setValue]);

  // The running total here is for display only. Points are recalculated and
  // stored server-side in `processPlayerData`, from the record itself — this
  // component used to POST its own number to an unauthenticated action, which
  // made the leaderboard whatever the client last said it was.

  return (
    <>
      {/* Null account type means nothing could resolve it — ask, and block
          until answered, because it decides which ladder this sheet scores
          against. Never in the readonly moderator view: that form is disabled,
          and the question belongs to the account's owner, not whoever is
          reviewing an old submission of theirs. */}
      {needsAccountType && <AccountTypeDialog playerName={playerName} />}
      <input
        {...register('rank', { value: rank })}
        defaultValue={rank}
        type="hidden"
      />
      <input
        {...register('points', { value: pointsAwarded })}
        defaultValue={pointsAwarded}
        type="hidden"
      />
      <header className={styles.scoreboard}>
        <div className={styles.scoreHead}>
          <span className={styles.rankBadge}>
            <Image
              alt={`${rank} icon`}
              src={getRankImageUrl(rank)}
              width={32}
              height={32}
              unoptimized
            />
          </span>
          <div className={styles.scoreIdentity}>
            <h1 className={styles.playerName} aria-label="Player name">
              {decodeURIComponent(submissionPlayerName)}
            </h1>
            <div className={styles.identityBadges}>
              <AccountTypeBadge accountType={accountType} size={16} />
              <StaffBadge role={staffRole} />
            </div>
            <p className={styles.rankTrack}>
              <span aria-label="Current rank">{rankName}</span>
              <ArrowRightIcon aria-hidden className={styles.rankArrow} />
              <span aria-label="Next rank">{nextRankName}</span>
              {nextRank && (
                <Image
                  alt={`${nextRank} icon`}
                  src={getRankImageUrl(nextRank)}
                  height={18}
                  width={18}
                  unoptimized
                />
              )}
            </p>
          </div>
          <div className={styles.scoreTotal}>
            <div className={styles.totalValue} aria-labelledby={totalId}>
              {formatNumber(pointsAwarded)}
            </div>
            <div className={styles.totalLabel} id={totalId}>
              Total points
            </div>
            {standing && (
              <div
                className={`${styles.standing} ${
                  standing.position <= exactPositionThreshold
                    ? styles.standingElite
                    : ''
                }`}
                title={`${formatNumber(standing.position)} of ${formatNumber(
                  standing.memberCount,
                )} active members`}
              >
                {standing.position <= exactPositionThreshold
                  ? `#${formatNumber(standing.position)} in the Grotto`
                  : `Top ${formatPercentage(standing.topPercent, 0)} of the Grotto`}
              </div>
            )}
          </div>
        </div>

        <div className={styles.meter}>
          <div className={styles.meterMeta}>
            <span id={remainingId}>Points to next rank</span>
            <span>
              {formatPercentage(pointsAwardedPercentage)}
              {' · '}
              <span aria-labelledby={remainingId}>
                {getPointsRemainingLabel(pointsRemaining, throttleReason)}
              </span>
            </span>
          </div>
          <div className={styles.meterTrack}>
            <div
              className={styles.meterFill}
              style={{
                width: `${Math.min(100, pointsAwardedPercentage * 100)}%`,
              }}
            />
          </div>
        </div>

        {/*
          Renders nothing unless this player is under the clan's minimum total
          level, which almost nobody is — mounted unconditionally rather than
          guarded here so the rule lives in one place.
        */}
        <TotalLevelGraceNotice totalLevel={totalLevel} />

        <div className={styles.scoreFoot}>
          <RankPace rank={rank} />
          <PlayerMeta />
          <div className={styles.metaPush} />
          <RankLadderModal currentRank={rank} />
        </div>
      </header>

      <Dialog.Root
        open={showRankUpDialog}
        onOpenChange={() => {
          setShowRankUpDialog(false);
        }}
      >
        <Dialog.Content maxWidth="450px">
          <Dialog.Title>Rank up</Dialog.Title>
          <Dialog.Description size="2" mb="2">
            Congratulations, you have achieved the <strong>{rankName}</strong>{' '}
            rank!
          </Dialog.Description>
          <Flex gap="3" mt="4" justify="end">
            <Dialog.Close>
              <Button variant="soft" color="gray">
                Cancel
              </Button>
            </Dialog.Close>
            <Dialog.Close
              onClick={() => {
                void handleToastUpdates(
                  publishRankSubmission({
                    totalPoints: pointsAwarded,
                    rank,
                  }),
                  { success: 'Rank application submitted!' },
                );
              }}
            >
              <Button variant="soft">Apply for promotion</Button>
            </Dialog.Close>
          </Flex>
        </Dialog.Content>
      </Dialog.Root>
    </>
  );
}
