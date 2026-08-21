'use client';

import { useState } from 'react';
import {
  Button,
  Callout,
  Dialog,
  Flex,
  RadioGroup,
  Text,
  TextField,
} from '@radix-ui/themes';
import { ExclamationTriangleIcon } from '@radix-ui/react-icons';
import { useFormContext } from 'react-hook-form';
import { toast } from 'react-toastify';
import {
  AccountTypeChoice,
  accountTypeChoiceLabels,
  accountTypeLabels,
} from '@/app/schemas/staff';
import { setAccountTypeAction } from '../actions/set-account-type-action';
import { registerOnTempleAction } from '../actions/register-on-temple-action';
import { RankCalculatorSchema } from '../[player]/submit-rank-calculator-validation';
import styles from './rank-calculator.module.css';

const choiceHints = {
  main: 'Ranked as a main account.',
  group_ironman:
    'On the group hiscores. We will check your group and confirm it for you.',
  unranked_group_ironman:
    'Not on the group hiscores — unranked groups never are.',
} as const satisfies Record<AccountTypeChoice, string>;

/**
 * Asks a player for the one thing no API can tell us.
 *
 * TempleOSRS reports a main both for actual mains and for every group ironman
 * whose group it has not been told about, and the hiscores offer no player ->
 * group lookup, so an unresolved account has to be settled by its owner. A
 * claimed group is then verified against the group hiscores; only unranked
 * groups, which are published nowhere, rest on the player's word — and they
 * have to say so deliberately, never by a lookup quietly failing.
 *
 * Deliberately unskippable: the answer decides which ladder the sheet in front
 * of them is scored against.
 */
export function AccountTypeDialog({ playerName }: { playerName: string }) {
  const { setValue } = useFormContext<RankCalculatorSchema>();
  // Starts unselected. Mains are allowed in the clan now, so a pre-ticked
  // "main" is a trap: one stray Confirm pins the account to `mainAccountRank`
  // and off the leaderboard. The answer has to be given, not defaulted into.
  const [choice, setChoice] = useState<AccountTypeChoice | null>(null);
  const [groupName, setGroupName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [missingGroupName, setMissingGroupName] = useState<string | null>(null);

  function handleResolved(accountType: RankCalculatorSchema['accountType']) {
    if (!accountType) {
      return;
    }

    setValue('accountType', accountType, { shouldDirty: true });
    toast.success(
      `Account type set to ${accountTypeLabels[accountType]}`,
    );
  }

  async function handleConfirm() {
    if (!choice) {
      return;
    }

    setIsSaving(true);

    const result = await setAccountTypeAction(playerName, choice, groupName);

    setIsSaving(false);

    if (!result.success) {
      toast.error('Failed to save your account type. Please try again.');

      return;
    }

    // The group did not check out. Stay open and let them correct the name,
    // get themselves onto Temple, or tell us the group is unranked.
    if (result.status === 'group-not-found') {
      setMissingGroupName(groupName.trim());

      return;
    }

    handleResolved(result.accountType);
  }

  async function handleRegisterOnTemple() {
    setIsRegistering(true);

    const result = await registerOnTempleAction(playerName);

    setIsRegistering(false);

    if (!result.success) {
      toast.error('Could not reach TempleOSRS. Please try again.');

      return;
    }

    if (!result.accountType) {
      toast.info(
        'Added to TempleOSRS. It cannot see your group yet — pick unranked for now, or try your group name again.',
      );

      return;
    }

    handleResolved(result.accountType);
  }

  return (
    <Dialog.Root open>
      <Dialog.Content
        maxWidth="440px"
        className={styles.modal}
        onEscapeKeyDown={(event) => event.preventDefault()}
        onPointerDownOutside={(event) => event.preventDefault()}
        onInteractOutside={(event) => event.preventDefault()}
      >
        <div className={styles.modalHeader}>
          <Dialog.Title className={styles.modalTitle}>
            Account type
          </Dialog.Title>
        </div>
        <div className={styles.modalBody}>
          <Text as="p" size="2" mb="3">
            We could not work out your game mode automatically — the hiscores
            do not list group ironmen individually. Which is this account?
          </Text>
          <RadioGroup.Root
            value={choice ?? ''}
            onValueChange={(value) => {
              setChoice(value as AccountTypeChoice);
              setMissingGroupName(null);
            }}
          >
            {AccountTypeChoice.options.map((option) => (
              <RadioGroup.Item key={option} value={option}>
                {accountTypeChoiceLabels[option]}
                <Text as="div" size="1" color="gray">
                  {choiceHints[option]}
                </Text>
              </RadioGroup.Item>
            ))}
          </RadioGroup.Root>
          {choice === 'group_ironman' && (
            <>
              <TextField.Root
                mt="3"
                maxLength={12}
                placeholder="Group name"
                aria-label="Group name"
                value={groupName}
                onChange={(event) => {
                  setGroupName(event.target.value);
                  setMissingGroupName(null);
                }}
              />
              {missingGroupName && (
                <Callout.Root color="amber" size="1" mt="3" role="alert">
                  <Callout.Icon>
                    <ExclamationTriangleIcon />
                  </Callout.Icon>
                  <Callout.Text>
                    We couldn&apos;t find your group. No group called{' '}
                    <strong>{missingGroupName}</strong> lists {playerName} on
                    the group hiscores. Check the spelling, add yourself to
                    TempleOSRS so it can vouch for you, or pick{' '}
                    <strong>
                      {accountTypeChoiceLabels.unranked_group_ironman}
                    </strong>{' '}
                    — unranked groups never appear on the hiscores.
                  </Callout.Text>
                </Callout.Root>
              )}
            </>
          )}
        </div>
        <div className={styles.modalFooter}>
          <Flex gap="3" justify="end">
            {missingGroupName && (
              <Button
                variant="soft"
                color="gray"
                loading={isRegistering}
                onClick={() => {
                  void handleRegisterOnTemple();
                }}
              >
                Add me to TempleOSRS
              </Button>
            )}
            <Button
              variant="solid"
              loading={isSaving}
              disabled={
                !choice || (choice === 'group_ironman' && !groupName.trim())
              }
              onClick={() => {
                void handleConfirm();
              }}
            >
              Confirm
            </Button>
          </Flex>
        </div>
      </Dialog.Content>
    </Dialog.Root>
  );
}
