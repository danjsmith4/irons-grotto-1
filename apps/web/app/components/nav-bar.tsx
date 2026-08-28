'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  ChevronDownIcon,
  DotsHorizontalIcon,
  PlusIcon,
  StopwatchIcon,
} from '@radix-ui/react-icons';
import { DropdownMenu, Spinner } from '@radix-ui/themes';
import { useState, useTransition } from 'react';
import { useFormContext, useFormState } from 'react-hook-form';
import { useAction } from 'next-safe-action/hooks';
import { toast } from 'react-toastify';
import { RankCalculatorSchema } from '@/app/player/[player]/submit-rank-calculator-validation';
import { publishRankSubmissionAction } from '@/app/player/[player]/actions/publish-rank-submission-action';
import { useRankCalculator } from '@/app/player/hooks/point-calculator/use-rank-calculator';
import { deletePlayerAccountAction } from '@/app/player/actions/delete-player-account-action';
import { DeleteSubmissionDataDialog } from '@/app/player/components/delete-submission-data-dialog';
import { handleToastUpdates } from '@/app/player/utils/handle-toast-updates';
import { useCurrentPlayer } from '@/app/player/contexts/current-player-context';
import { getRankName } from '@/app/player/utils/get-rank-name';
import { isRankUp } from '@/app/player/utils/is-rank-up';
import { canAccessAdminDashboard } from '@/app/utils/staff-permissions';
import { canApplyForRank } from '@/config/ranks';
import { useViewerStaffRole } from './use-viewer-staff-role';
import { EventStatus } from './event-status';
import styles from './nav-bar.module.css';

interface NavBarProps {
  currentPage?: 'dashboard' | 'player' | 'submission' | 'admin' | 'tools';
  playerName?: string;
  /**
   * Renders the calculator's own actions: the "Apply for promotion" button and
   * the reset/delete entries in the overflow menu. Only the sheet's owner sees
   * them — the readonly moderator view leaves this off.
   */
  showCalculatorActions?: boolean;
  isActionActive?: boolean;
  /**
   * Forces any pending autosave out before a submission snapshots the sheet.
   * Replaces the old `onSave` / `canSave` / `isSaving` trio, which existed
   * only to drive a Save button.
   */
  beforeSubmit?: () => Promise<void>;
  userCalculators?: Record<
    string,
    {
      rsn: string;
      rank?: string;
      joinDate: Date;
    }
  >;
  additionalButtons?: React.ReactNode;
}

export function NavBar({
  currentPage = 'dashboard',
  playerName,
  showCalculatorActions = false,
  isActionActive = false,
  beforeSubmit,
  userCalculators = {},
  additionalButtons,
}: NavBarProps) {
  const router = useRouter();
  const viewerStaffRole = useViewerStaffRole();
  const canAdminister = canAccessAdminDashboard(viewerStaffRole);

  // Form hooks - these will be null when not in form context
  const formContext = showCalculatorActions
    ? useFormContext<RankCalculatorSchema>()
    : null;
  const formState = showCalculatorActions
    ? useFormState<RankCalculatorSchema>()
    : null;
  const rankCalculator = showCalculatorActions ? useRankCalculator() : null;
  const currentPlayer = showCalculatorActions ? useCurrentPlayer() : null;

  const [, startResetTransition] = useTransition();
  const [, startDeleteDialogTransition] = useTransition();
  const [
    isDeleteSubmissionDataDialogOpen,
    setIsDeleteSubmissionDataDialogOpen,
  ] = useState(false);

  // Extract values with safe defaults
  const reset = formContext?.reset;
  const isDirty = formState?.isDirty ?? false;
  const isSubmitting = formState?.isSubmitting ?? false;
  const totalPoints = rankCalculator?.pointsAwarded ?? 0;
  const rank = rankCalculator?.rank ?? null;
  const currentPlayerName = currentPlayer?.playerName ?? '';
  const currentRank = currentPlayer?.rank ?? null;
  const accountType = formContext?.watch('accountType') ?? null;

  // Action hooks - only bind when we have the required data
  const { executeAsync: publishRankSubmission } = useAction(
    publishRankSubmissionAction.bind(
      null,
      currentRank ?? undefined,
      currentPlayerName ?? playerName ?? '',
    ),
  );

  const { executeAsync: deletePlayerAccount } = useAction(
    deletePlayerAccountAction,
  );

  const handleSignOut = async () => {
    await fetch('/api/logout', { method: 'POST' });
    router.push('/');
  };

  const accounts = Object.values(userCalculators);
  const isBusy = isSubmitting || isActionActive;

  // A promotion is actually waiting: the calculated rank is further up the
  // ladder than the one they hold. That is the only state worth spending the
  // green accent on — re-applying at a rank you already have is not.
  const hasPromotion =
    !!rank &&
    canApplyForRank(accountType) &&
    isRankUp(currentRank, rank, accountType);
  const applyLabel = hasPromotion
    ? `Apply for ${getRankName(rank)}`
    : 'Apply for promotion';

  function handleApplyForPromotion() {
    // Explained rather than silently disabled — a main's sheet still works,
    // it just isn't on the rank ladder.
    if (!canApplyForRank(accountType)) {
      toast.error(
        'Main accounts cannot apply for clan ranks. Your calculator is still yours for tracking progress.',
      );

      return;
    }

    if (!rank) {
      toast.error('No rank calculated yet!');

      return;
    }

    // Whatever is on screen has to be stored before the submission snapshots
    // it. This replaces the dirty check: the question was never "is the form
    // dirty", it was "is what I am about to submit what they see".
    void handleToastUpdates(
      beforeSubmit?.().then(() =>
        publishRankSubmission({ totalPoints, rank }),
      ) ?? publishRankSubmission({ totalPoints, rank }),
      { success: 'Rank application submitted!' },
    );
  }

  return (
    <nav className={styles.nav}>
      <div className={styles.inner}>
        <Link href="/dashboard" className={styles.brand}>
          <Image
            src="/L1.png"
            alt="Irons Grotto"
            width={30}
            height={30}
            className={styles.brandMark}
          />
          <span className={styles.brandName}>Irons Grotto</span>
        </Link>

        <div className={styles.links}>
          <Link
            href="/dashboard"
            className={`${styles.link} ${
              currentPage === 'dashboard' ? styles.linkActive : ''
            }`}
          >
            Dashboard
          </Link>

          <DropdownMenu.Root>
            <DropdownMenu.Trigger>
              <button
                type="button"
                className={`${styles.link} ${
                  currentPage === 'player' ? styles.linkActive : ''
                }`}
              >
                Accounts
                <ChevronDownIcon />
              </button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Content>
              {accounts.length > 0 && (
                <>
                  <DropdownMenu.Label>Your accounts</DropdownMenu.Label>
                  {accounts.map((player) => (
                    <DropdownMenu.Item key={player.rsn} asChild>
                      <Link
                        href={`/player/${encodeURIComponent(player.rsn)}`}
                      >
                        {player.rsn}
                        <span className={styles.menuMeta}>
                          {player.rank ?? 'Unranked'}
                        </span>
                      </Link>
                    </DropdownMenu.Item>
                  ))}
                  <DropdownMenu.Separator />
                </>
              )}
              <DropdownMenu.Item asChild>
                <Link href="/join">
                  <PlusIcon />
                  New account
                </Link>
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Root>

          {/* Standalone calculators for specific in-game content. They read no
              player data, so unlike everything else in this bar they work
              signed out — the menu is here rather than on a /tools index
              because one click should reach the tool. */}
          <DropdownMenu.Root>
            <DropdownMenu.Trigger>
              <button
                type="button"
                className={`${styles.link} ${
                  currentPage === 'tools' ? styles.linkActive : ''
                }`}
              >
                Tools
                <ChevronDownIcon />
              </button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Content>
              <DropdownMenu.Label>Combat achievements</DropdownMenu.Label>
              <DropdownMenu.Item asChild>
                <Link href="/tools/maggot-king">
                  <StopwatchIcon />
                  Maggot King
                  <span className={styles.menuMeta}>Speed Chaser</span>
                </Link>
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Root>

          {/*
            Only elevated accounts see this. The page enforces the same check
            server-side, so hiding it is presentation, not security.
          */}
          {canAdminister && (
            <Link
              href="/admin"
              className={`${styles.link} ${
                currentPage === 'admin' ? styles.linkActive : ''
              }`}
            >
              Admin
            </Link>
          )}
        </div>

        <div className={styles.spacer} />

        <div className={styles.actions}>
          {/* Renders nothing unless an event is running or queued — see the
              component. It sits before the page's own actions because it is
              about the clan, not about this page. */}
          <EventStatus />

          {additionalButtons}

          {/* There is no Save button — changes persist as they are made, see
              `useAutosave`. Applying for a rank is what is left, and it is the
              page's one real action, so it gets the button. Its old chevron
              had nothing to hang off once Save went; resetting and deleting
              are neither primary nor frequent, so they moved into the
              overflow menu below rather than propping up a split control. */}
          {showCalculatorActions && (
            <>
              <button
                type="button"
                className={`${styles.primaryAction} ${
                  hasPromotion ? '' : styles.primaryActionQuiet
                }`}
                onClick={handleApplyForPromotion}
                disabled={isBusy}
                aria-label={applyLabel}
              >
                {isBusy && <Spinner size="1" />}
                <span className={styles.primaryActionLabel}>{applyLabel}</span>
                <span className={styles.primaryActionLabelShort}>Apply</span>
              </button>
              <DeleteSubmissionDataDialog
                open={isDeleteSubmissionDataDialogOpen}
                onOpenChange={setIsDeleteSubmissionDataDialogOpen}
                customDeleteAction={() => {
                  void handleToastUpdates(
                    deletePlayerAccount(currentPlayerName ?? playerName ?? ''),
                    { success: 'Player account deleted!' },
                  );

                  // Redirect to dashboard regardless of result
                  router.push('/dashboard');
                }}
              />
            </>
          )}

          <DropdownMenu.Root>
            <DropdownMenu.Trigger>
              <button
                type="button"
                className={styles.iconButton}
                aria-label="More"
              >
                <DotsHorizontalIcon />
              </button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Content>
              {showCalculatorActions && (
                <>
                  <DropdownMenu.Label>This calculator</DropdownMenu.Label>
                  <DropdownMenu.Item
                    disabled={!isDirty || isBusy}
                    onSelect={() => {
                      startResetTransition(() => {
                        reset?.();
                      });
                    }}
                  >
                    Reset form defaults
                  </DropdownMenu.Item>
                  <DropdownMenu.Item
                    color="red"
                    disabled={isBusy}
                    onSelect={() => {
                      startDeleteDialogTransition(() => {
                        setIsDeleteSubmissionDataDialogOpen(true);
                      });
                    }}
                  >
                    Delete data
                  </DropdownMenu.Item>
                  <DropdownMenu.Separator />
                </>
              )}
              <DropdownMenu.Item asChild>
                <Link
                  href="https://discord.com/channels/697877518455144468/1385071226837274808"
                  target="_blank"
                >
                  Help
                </Link>
              </DropdownMenu.Item>
              <DropdownMenu.Separator />
              <DropdownMenu.Item
                onSelect={() => {
                  void handleSignOut();
                }}
              >
                Sign out
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Root>
        </div>
      </div>
    </nav>
  );
}
