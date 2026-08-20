'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  ChevronDownIcon,
  DotsHorizontalIcon,
  PlusIcon,
} from '@radix-ui/react-icons';
import { DropdownMenu, Spinner } from '@radix-ui/themes';
import { useState, useTransition } from 'react';
import { useFormContext, useFormState } from 'react-hook-form';
import { useAction } from 'next-safe-action/hooks';
import { toast } from 'react-toastify';
import { RankCalculatorSchema } from '@/app/rank-calculator/[player]/submit-rank-calculator-validation';
import { publishRankSubmissionAction } from '@/app/rank-calculator/[player]/actions/publish-rank-submission-action';
import { useRankCalculator } from '@/app/rank-calculator/hooks/point-calculator/use-rank-calculator';
import { deletePlayerAccountAction } from '@/app/rank-calculator/actions/delete-player-account-action';
import { DeleteSubmissionDataDialog } from '@/app/rank-calculator/components/delete-submission-data-dialog';
import { handleToastUpdates } from '@/app/rank-calculator/utils/handle-toast-updates';
import { useCurrentPlayer } from '@/app/rank-calculator/contexts/current-player-context';
import styles from './nav-bar.module.css';

interface NavBarProps {
  currentPage?: 'dashboard' | 'player' | 'submission';
  playerName?: string;
  showSaveActions?: boolean;
  onSave?: () => void;
  isSaving?: boolean;
  canSave?: boolean;
  isActionActive?: boolean;
  userCalculators?: Record<
    string,
    {
      rsn: string;
      rank?: string;
      joinDate: Date;
    }
  >;
  submitForm?: () => Promise<void> | void;
  additionalButtons?: React.ReactNode;
}

export function NavBar({
  currentPage = 'dashboard',
  playerName,
  showSaveActions = false,
  onSave: _onSave,
  isSaving: _isSaving = false,
  canSave: _canSave = false,
  isActionActive = false,
  userCalculators = {},
  submitForm,
  additionalButtons,
}: NavBarProps) {
  const router = useRouter();

  // Form hooks - these will be null when not in form context
  const formContext = showSaveActions
    ? useFormContext<RankCalculatorSchema>()
    : null;
  const formState = showSaveActions
    ? useFormState<RankCalculatorSchema>()
    : null;
  const rankCalculator = showSaveActions ? useRankCalculator() : null;
  const currentPlayer = showSaveActions ? useCurrentPlayer() : null;

  const [, startResetTransition] = useTransition();
  const [, startDeleteDialogTransition] = useTransition();
  const [
    isDeleteSubmissionDataDialogOpen,
    setIsDeleteSubmissionDataDialogOpen,
  ] = useState(false);

  // Extract values with safe defaults
  const reset = formContext?.reset;
  const isValid = formState?.isValid ?? false;
  const isDirty = formState?.isDirty ?? false;
  const isSubmitting = formState?.isSubmitting ?? false;
  const totalPoints = rankCalculator?.pointsAwarded ?? 0;
  const rank = rankCalculator?.rank ?? null;
  const currentPlayerName = currentPlayer?.playerName ?? '';
  const currentRank = currentPlayer?.rank ?? null;

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
                        href={`/rank-calculator/${encodeURIComponent(player.rsn)}`}
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
                <Link href="/rank-calculator/players/add">
                  <PlusIcon />
                  New account
                </Link>
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Root>
        </div>

        <div className={styles.spacer} />

        <div className={styles.actions}>
          {additionalButtons}

          {showSaveActions && (
            <div className={styles.save}>
              <button
                type="button"
                className={styles.saveMain}
                disabled={!isDirty || !isValid || isBusy}
                onClick={() => {
                  if (submitForm) {
                    void submitForm();
                  }
                }}
              >
                {isBusy && <Spinner size="1" />}
                Save
              </button>
              <DropdownMenu.Root modal={false}>
                <DropdownMenu.Trigger disabled={isBusy}>
                  <button
                    type="button"
                    className={styles.saveMore}
                    disabled={isBusy}
                    aria-label="More save actions"
                  >
                    <ChevronDownIcon />
                  </button>
                </DropdownMenu.Trigger>
                <DropdownMenu.Content color="gray" variant="soft">
                  <DropdownMenu.Item
                    onClick={() => {
                      if (isDirty) {
                        toast.error('Please save your data first!');

                        return;
                      }

                      if (!rank) {
                        toast.error('No rank calculated yet!');

                        return;
                      }

                      void handleToastUpdates(
                        publishRankSubmission({ totalPoints, rank }),
                        { success: 'Rank application submitted!' },
                      );
                    }}
                  >
                    Apply for promotion
                  </DropdownMenu.Item>
                  <DropdownMenu.Item
                    disabled={!isDirty}
                    onClick={() => {
                      startResetTransition(() => {
                        reset?.();
                      });
                    }}
                  >
                    Reset form defaults
                  </DropdownMenu.Item>
                  <DropdownMenu.Separator />
                  <DropdownMenu.Item
                    color="red"
                    onSelect={() => {
                      startDeleteDialogTransition(() => {
                        setIsDeleteSubmissionDataDialogOpen(true);
                      });
                    }}
                  >
                    Delete data
                  </DropdownMenu.Item>
                </DropdownMenu.Content>
              </DropdownMenu.Root>
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
            </div>
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
