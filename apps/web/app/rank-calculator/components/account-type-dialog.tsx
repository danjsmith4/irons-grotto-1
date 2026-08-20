'use client';

import { useState } from 'react';
import { Button, Dialog, RadioGroup, Text, TextField } from '@radix-ui/themes';
import { useFormContext } from 'react-hook-form';
import { toast } from 'react-toastify';
import {
  AccountTypeChoice,
  accountTypeChoiceLabels,
  accountTypeLabels,
} from '@/app/schemas/staff';
import { setAccountTypeAction } from '../actions/set-account-type-action';
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
 * groups, which are published nowhere, rest on the player's word.
 *
 * Deliberately unskippable: the answer decides which ladder the sheet in front
 * of them is scored against.
 */
export function AccountTypeDialog({ playerName }: { playerName: string }) {
  const { setValue } = useFormContext<RankCalculatorSchema>();
  const [choice, setChoice] = useState<AccountTypeChoice>('main');
  const [groupName, setGroupName] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  async function handleConfirm() {
    setIsSaving(true);

    const result = await setAccountTypeAction(playerName, choice, groupName);

    setIsSaving(false);

    if (!result.success) {
      toast.error('Failed to save your account type. Please try again.');

      return;
    }

    setValue('accountType', result.accountType, { shouldDirty: true });
    toast.success(`Account type set to ${accountTypeLabels[result.accountType]}`);
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
            value={choice}
            onValueChange={(value) => setChoice(value as AccountTypeChoice)}
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
            <TextField.Root
              mt="3"
              maxLength={12}
              placeholder="Group name"
              aria-label="Group name"
              value={groupName}
              onChange={(event) => setGroupName(event.target.value)}
            />
          )}
        </div>
        <div className={styles.modalFooter}>
          <Button
            variant="solid"
            loading={isSaving}
            disabled={choice === 'group_ironman' && !groupName.trim()}
            onClick={() => {
              void handleConfirm();
            }}
          >
            Confirm
          </Button>
        </div>
      </Dialog.Content>
    </Dialog.Root>
  );
}
