'use client';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { ChevronDownIcon } from '@radix-ui/react-icons';
import { DropdownMenu, Flex, IconButton } from '@radix-ui/themes';
import { IronsButton } from '@/app/rank-calculator/components/irons-button';
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

  return (
    <nav
      style={{
        position: 'sticky',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
        background: 'rgba(26, 13, 46, 0.95)',
        backdropFilter: 'blur(10px)',
        borderBottom: '1px solid rgba(206, 147, 216, 0.2)',
        padding: '1rem 2rem',
      }}
    >
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        <Flex justify="between" align="center">
          {/* Left side - Logo and Navigation */}
          <Flex align="center" gap="4">
            {/* Logo */}
            <Link href="/dashboard">
              <Image
                src="/L2.png"
                alt="Irons Grotto Logo"
                width={70}
                height={70}
                style={{
                  filter: 'drop-shadow(0 0 10px rgba(233, 30, 99, 0.3))',
                  cursor: 'pointer',
                }}
              />
            </Link>

            {/* Dashboard Button */}
            <IronsButton
              asChild
              variant={currentPage === 'dashboard' ? 'primary' : 'ghost'}
              size="2"
            >
              <Link href="/dashboard">Dashboard</Link>
            </IronsButton>

            {/* Rank Calculator Dropdown */}
            <DropdownMenu.Root>
              <DropdownMenu.Trigger>
                <IronsButton
                  variant={currentPage === 'player' ? 'primary' : 'ghost'}
                  size="2"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                  }}
                >
                  Accounts
                  <ChevronDownIcon />
                </IronsButton>
              </DropdownMenu.Trigger>
              <DropdownMenu.Content>
                <DropdownMenu.Item asChild>
                  <Link href="/rank-calculator/players/add">New Account</Link>
                </DropdownMenu.Item>
                {Object.keys(userCalculators).length > 0 && (
                  <>
                    <DropdownMenu.Separator />
                    <DropdownMenu.Label>Your Accounts</DropdownMenu.Label>
                    {Object.values(userCalculators).map((player) => (
                      <DropdownMenu.Item key={player.rsn} asChild>
                        <Link
                          href={`/rank-calculator/${encodeURIComponent(player.rsn)}`}
                        >
                          {player.rsn}
                          <span
                            style={{
                              marginLeft: 'auto',
                              fontSize: '0.75rem',
                              color: 'rgba(255, 255, 255, 0.6)',
                            }}
                          >
                            ({player.rank ?? 'Unranked'})
                          </span>
                        </Link>
                      </DropdownMenu.Item>
                    ))}
                  </>
                )}
              </DropdownMenu.Content>
            </DropdownMenu.Root>
          </Flex>

          {/* Right side - Actions */}
          <Flex
            align="center"
            gap="3"
            style={{ justifyContent: 'space-around' }}
          >
            {/* Help Button */}
            <IronsButton asChild variant="ghost" size="2">
              <Link
                href="https://discord.com/channels/697877518455144468/1385071226837274808"
                target="_blank"
              >
                Help
              </Link>
            </IronsButton>

            {/* Sign Out Button */}
            <IronsButton variant="secondary" size="2" onClick={handleSignOut}>
              Sign Out
            </IronsButton>

            {/* Additional Buttons */}
            {additionalButtons}

            {/* Save Actions (only on player pages) - moved to the right */}
            {showSaveActions && (
              <Flex>
                <IronsButton
                  loading={isSubmitting || isActionActive}
                  disabled={
                    !isDirty || !isValid || isSubmitting || isActionActive
                  }
                  variant="primary"
                  size="2"
                  style={{
                    borderTopRightRadius: 0,
                    borderBottomRightRadius: 0,
                  }}
                  onClick={() => {
                    if (submitForm) {
                      void submitForm();
                    }
                  }}
                >
                  Save
                </IronsButton>
                <DropdownMenu.Root modal={false}>
                  <DropdownMenu.Trigger
                    disabled={isSubmitting || isActionActive}
                  >
                    <IconButton
                      className="save-dropdown-button"
                      variant="soft"
                      type="button"
                      style={{
                        borderTopLeftRadius: 0,
                        borderBottomLeftRadius: 0,
                        transition: 'none !important',
                        transform: 'none !important',
                      }}
                    >
                      <ChevronDownIcon
                        style={{ transition: 'none', transform: 'none' }}
                      />
                    </IconButton>
                  </DropdownMenu.Trigger>
                  <DropdownMenu.Content color="gray" variant="soft">
                    <DropdownMenu.Item
                      onClick={() => {
                        console.log(
                          '🔵 Apply for promotion nav dropdown clicked!',
                          {
                            isDirty,
                            totalPoints,
                            rank,
                            currentRank,
                            playerName: currentPlayerName,
                          },
                        );

                        if (isDirty) {
                          toast.error('Please save your data first!');
                          return;
                        }

                        if (!rank) {
                          toast.error('No rank calculated yet!');
                          return;
                        }

                        void handleToastUpdates(
                          publishRankSubmission({
                            totalPoints,
                            rank,
                          }),
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
                    {playerName && (
                      <DropdownMenu.Item asChild>
                        <Link
                          href={`/rank-calculator/players/edit/${playerName.toLowerCase()}`}
                        >
                          Edit player
                        </Link>
                      </DropdownMenu.Item>
                    )}
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
                      deletePlayerAccount(
                        currentPlayerName ?? playerName ?? '',
                      ),
                      { success: 'Player account deleted!' },
                    );

                    // Redirect to dashboard regardless of result
                    router.push('/dashboard');
                  }}
                />
              </Flex>
            )}
          </Flex>
        </Flex>
      </div>
    </nav>
  );
}
