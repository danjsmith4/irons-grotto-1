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
  Link,
} from '@radix-ui/themes';
import { ExclamationTriangleIcon } from '@radix-ui/react-icons';
import { useFormContext } from 'react-hook-form';
import { toast } from 'react-toastify';
import {
  AccountTypeChoice,
  accountTypeChoiceLabels,
  accountTypeLabels,
} from '@/app/schemas/staff';
import { clientConstants } from '@/config/constants.client';
import { setAccountTypeAction } from '../actions/set-account-type-action';
import { RankCalculatorSchema } from '../[player]/submit-rank-calculator-validation';
import styles from './rank-calculator.module.css';

const choiceHints = {
  main: 'Ranked as a main account.',
  group_ironman:
    'Your group is tracked on TempleOSRS. We will confirm it with Temple.',
  unranked_group_ironman:
    'An unranked group. These are published nowhere, so we take your word.',
} as const satisfies Record<AccountTypeChoice, string>;

/**
 * Asks a player for the one thing no API can tell us.
 *
 * TempleOSRS reports a main both for actual mains and for every group ironman
 * whose group is not on its GIM tracking, so an unresolved account has to be
 * settled by its owner. A claimed group is then confirmed with Temple — and
 * when Temple still cannot see it, the player is sent to add their group to
 * Temple's GIM tracking rather than being quietly downgraded to unranked.
 * Only unranked groups, which are published nowhere, rest on the player's
 * word, and they have to say so deliberately.
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
  const [missingGroupName, setMissingGroupName] = useState<string | null>(null);

  function handleResolved(accountType: RankCalculatorSchema['accountType']) {
    if (!accountType) {
      return;
    }

    setValue('accountType', accountType, { shouldDirty: true });
    toast.success(`Account type set to ${accountTypeLabels[accountType]}`);
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

    // Temple cannot see a group for this account. Stay open and point them at
    // Temple's GIM tracking, which is the one thing that fixes it.
    if (result.status === 'group-not-tracked') {
      setMissingGroupName(groupName.trim());

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
            We could not work out your game mode automatically — TempleOSRS
            cannot tell a group ironman from a main until the group is tracked.
            Which is this account?
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
                    <strong>
                      Your group isn&apos;t being tracked on TempleOSRS yet.
                    </strong>{' '}
                    We read every account&apos;s game mode from Temple, and
                    Temple can only see a group ironman once that group is on
                    its GIM tracking — until then your account looks the same as
                    a main to it.
                    <br />
                    <br />
                    <Link
                      href={clientConstants.temple.gimTrackingUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      weight="bold"
                    >
                      Add your group to TempleOSRS GIM tracking ↗
                    </Link>{' '}
                    then come back and press <strong>Confirm</strong> again.
                    <br />
                    <br />
                    If your group is <em>unranked</em>, it will never appear
                    there — pick{' '}
                    <strong>
                      {accountTypeChoiceLabels.unranked_group_ironman}
                    </strong>{' '}
                    instead.
                  </Callout.Text>
                </Callout.Root>
              )}
            </>
          )}
        </div>
        <div className={styles.modalFooter}>
          <Flex gap="3" justify="end">
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
