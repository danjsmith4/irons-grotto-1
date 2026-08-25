'use client';

import {
  Box,
  Button,
  Callout,
  Dialog,
  Flex,
  Spinner,
  Text,
} from '@radix-ui/themes';
import { FormProvider } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import { ErrorMessage } from '@hookform/error-message';
import { CalendarIcon, CircleBackslashIcon } from '@radix-ui/react-icons';
import { toast } from 'react-toastify';
import { useHookFormAction } from '@next-safe-action/adapter-react-hook-form/hooks';
import { zodResolver } from '@hookform/resolvers/zod';
import { debounce } from 'lodash';
import { useAction } from 'next-safe-action/hooks';
import { Player } from '@/app/schemas/player';
import { Input } from '@/app/player/components/input';
import { Label } from '@/app/player/components/label';
import { DatePicker } from '@/app/player/components/date-picker';
import { PlayerNameInput } from './components/player-name-input';
import { editPlayerAction } from './actions/edit-player-action';
import { fetchPlayerJoinDateAction } from '@/app/join/actions/fetch-player-join-date-action';
import { EditPlayerSchema } from './actions/edit-player-schema';
import { Checkbox } from '@/app/player/components/checkbox';
import styles from '@/app/player/components/rank-calculator.module.css';

interface EditPlayerFormProps {
  members: string[];
  playerRecord: Player;
}

export function EditPlayerForm({ members, playerRecord }: EditPlayerFormProps) {
  const router = useRouter();
  const boundEditPlayerAction = editPlayerAction.bind(
    null,
    playerRecord.rsn,
    playerRecord.rank,
  );
  const { form, handleSubmitWithAction } = useHookFormAction(
    boundEditPlayerAction,
    zodResolver(EditPlayerSchema),
    {
      actionProps: {
        onError({ error }) {
          if (error.serverError) {
            toast.error('Failed to edit player!');
          }
        },
        onSuccess() {
          toast.success(`Player edited successfully!`);

          router.push(`/dashboard`);
        },
      },
      formProps: {
        mode: 'onSubmit',
        criteriaMode: 'all',
        defaultValues: {
          joinDate: new Date(playerRecord.joinDate),
          playerName: playerRecord.rsn,
          isMobileOnly: playerRecord.isMobileOnly,
        },
      },
    },
  );
  const { isDirty, errors, isSubmitting } = form.formState;

  const {
    execute: executeFetchPlayerJoinDate,
    isExecuting: isFetchPlayerJoinDateExecuting,
  } = useAction(fetchPlayerJoinDateAction, {
    onSettled({ result }) {
      if (result.data) {
        form.setValue('joinDate', result.data, {
          shouldDirty: true,
        });
      }
    },
  });

  const debouncedExecuteFetchPlayerJoinDate = debounce(
    executeFetchPlayerJoinDate,
    600,
  );

  return (
    <FormProvider {...form}>
      {/* A route rather than a dialog trigger — the calculator redirects here
          when a player's name stops resolving — so it opens on mount and
          dismissing navigates back, the same as the Back button. */}
      <Dialog.Root
        open
        onOpenChange={() => {
          router.push('/dashboard');
        }}
      >
        <Dialog.Content maxWidth="460px" className={styles.modal}>
          <form onSubmit={handleSubmitWithAction}>
            <div className={styles.modalHeader}>
              <Dialog.Title className={styles.modalTitle}>
                Editing {playerRecord.rsn}
              </Dialog.Title>
            </div>
            <div className={styles.modalBody}>
              {playerRecord.isNameInvalid && (
                <Callout.Root variant="soft" color="red" size="1" mb="3">
                  <Callout.Icon>
                    <CircleBackslashIcon />
                  </Callout.Icon>
                  <Callout.Text>
                    Your player name has become invalid (this is usually due to
                    a name change). Please update it to regain access to the
                    calculator.
                  </Callout.Text>
                </Callout.Root>
              )}
              <Flex direction="column" gap="3">
                <Flex direction="column" gap="2">
                  <PlayerNameInput
                    members={members}
                    onChange={debouncedExecuteFetchPlayerJoinDate}
                  />
                </Flex>
                <Flex direction="column" gap="2">
                  <Label weight="bold">
                    <Text as="p" mb="2">
                      Join date
                    </Text>
                    <Box asChild width="100%">
                      <DatePicker
                        disabled={isFetchPlayerJoinDateExecuting}
                        name="joinDate"
                        required
                        placeholderText="dd/mm/yyyy"
                        size="3"
                        customInput={
                          <Input
                            size="3"
                            hasError={!!errors.joinDate}
                            leftIcon={<CalendarIcon />}
                            rightIcon={
                              isFetchPlayerJoinDateExecuting ? (
                                <Spinner />
                              ) : undefined
                            }
                          />
                        }
                      />
                    </Box>
                  </Label>
                  <ErrorMessage
                    errors={errors}
                    name="joinDate"
                    render={({ message }) => (
                      <Text as="p" color="red">
                        {message}
                      </Text>
                    )}
                  />
                </Flex>
                <Flex direction="row" gap="2" align="center" asChild>
                  <Label weight="bold">
                    <Checkbox
                      checked={form.watch('isMobileOnly')}
                      name="isMobileOnly"
                    />
                    <Text as="span">Mobile only player</Text>
                  </Label>
                </Flex>
              </Flex>
            </div>
            <div className={styles.modalFooter}>
              <Button
                type="button"
                color="gray"
                variant="soft"
                onClick={() => {
                  router.push('/dashboard');
                }}
              >
                Back
              </Button>
              <Button
                disabled={!isDirty || isSubmitting}
                loading={isSubmitting}
              >
                Save
              </Button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Root>
    </FormProvider>
  );
}
