'use client';

import {
  Box,
  Button,
  Flex,
  Heading,
  RadioGroup,
  Spinner,
  Text,
  TextField,
} from '@radix-ui/themes';
import { useState } from 'react';
import { FormProvider } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import { ErrorMessage } from '@hookform/error-message';
import { CalendarIcon } from '@radix-ui/react-icons';
import { useHookFormAction } from '@next-safe-action/adapter-react-hook-form/hooks';
import { zodResolver } from '@hookform/resolvers/zod';
import { debounce } from 'lodash';
import { useAction } from 'next-safe-action/hooks';
import { Input } from '../../components/input';
import { Label } from '../../components/label';
import { DatePicker } from '../../components/date-picker';
import { PlayerNameInput } from './components/player-name-input';
import { addPlayerAction } from './actions/add-player-action';
import { fetchPlayerJoinDateAction } from '../actions/fetch-player-join-date-action';
import { AddPlayerSchema } from './actions/add-player-schema';
import { fetchAccountTypeAction } from './actions/fetch-account-type-action';
import { Checkbox } from '../../components/checkbox';
import {
  AccountTypeChoice,
  accountTypeChoiceLabels,
} from '@/app/schemas/staff';

interface AddPlayerFormProps {
  members: string[];
}

export function AddPlayerForm({ members }: AddPlayerFormProps) {
  const router = useRouter();
  const { form, handleSubmitWithAction, action } = useHookFormAction(
    addPlayerAction,
    zodResolver(AddPlayerSchema),
    {
      actionProps: {
        onSuccess() {
          router.push(`/dashboard`);
        },
      },
      formProps: {
        mode: 'onSubmit',
        criteriaMode: 'all',
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

  // Most accounts resolve from TempleOSRS, so the account-type question only
  // appears for the ones that cannot — group ironmen look exactly like mains
  // on every public API.
  const [needsAccountType, setNeedsAccountType] = useState(false);
  const { execute: executeFetchAccountType } = useAction(
    fetchAccountTypeAction,
    {
      onSettled({ result }) {
        const isUnresolved = !result.data?.accountType;

        setNeedsAccountType(isUnresolved);
        form.setValue('accountType', isUnresolved ? 'main' : undefined);
      },
    },
  );

  const debouncedExecuteFetchPlayerJoinDate = debounce(
    executeFetchPlayerJoinDate,
    600,
  );

  const debouncedExecuteFetchAccountType = debounce(
    executeFetchAccountType,
    600,
  );

  const accountType = form.watch('accountType');

  return (
    <FormProvider {...form}>
      <form onSubmit={handleSubmitWithAction}>
        <Flex
          height="100vh"
          align="center"
          justify="center"
          gap="6"
          direction="column"
          width="450px"
          my="0"
          mx="auto"
        >
          <Heading size="5">Add new player</Heading>
          {action.result?.serverError && (
            <Flex
              direction="column"
              gap="2"
              p="3"
              style={{
                backgroundColor: 'var(--red-2)',
                borderColor: 'var(--red-6)',
                borderWidth: '1px',
                borderStyle: 'solid',
                borderRadius: 'var(--radius-2)',
              }}
            >
              <Text color="red" weight="medium">
                {action.result.serverError}
              </Text>
            </Flex>
          )}
          <Flex direction="column" gap="3" width="330px">
            <Flex direction="column" gap="2">
              <PlayerNameInput
                members={members}
                onChange={(input) => {
                  debouncedExecuteFetchPlayerJoinDate(input);
                  debouncedExecuteFetchAccountType({ playerName: input });
                }}
              />
            </Flex>
            <Flex direction="column" gap="2">
              <Label weight="bold">
                <Text as="p" mb="2">
                  Join date
                </Text>
                <Box asChild width="100%">
                  <DatePicker<AddPlayerSchema>
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
            {needsAccountType && (
              <Flex direction="column" gap="2">
                <Label weight="bold">Account type</Label>
                <Text as="p" size="1" color="gray">
                  We could not work this out automatically — group ironmen are
                  not listed individually on the hiscores.
                </Text>
                <RadioGroup.Root
                  value={accountType ?? 'main'}
                  onValueChange={(value) => {
                    form.setValue('accountType', value as AccountTypeChoice, {
                      shouldDirty: true,
                    });
                  }}
                >
                  {AccountTypeChoice.options.map((option) => (
                    <RadioGroup.Item key={option} value={option}>
                      {accountTypeChoiceLabels[option]}
                    </RadioGroup.Item>
                  ))}
                </RadioGroup.Root>
                {accountType === 'group_ironman' && (
                  <>
                    <TextField.Root
                      maxLength={12}
                      placeholder="Group name"
                      aria-label="Group name"
                      value={form.watch('gimGroupName') ?? ''}
                      onChange={(event) => {
                        form.setValue('gimGroupName', event.target.value, {
                          shouldDirty: true,
                        });
                      }}
                    />
                    <ErrorMessage
                      errors={errors}
                      name="gimGroupName"
                      render={({ message }) => (
                        <Text as="p" color="red" size="1">
                          {message}
                        </Text>
                      )}
                    />
                  </>
                )}
              </Flex>
            )}
            <Flex gap="2" mt="2">
              <Flex flexGrow="1">
                <Box asChild width="100%">
                  <Button
                    type="button"
                    color="gray"
                    size="3"
                    onClick={() => {
                      router.push('/dashboard');
                    }}
                    variant="soft"
                  >
                    Back
                  </Button>
                </Box>
              </Flex>
              <Flex flexGrow="1">
                <Box asChild width="100%">
                  <Button
                    disabled={!isDirty || isSubmitting}
                    loading={isSubmitting}
                    size="3"
                  >
                    Save
                  </Button>
                </Box>
              </Flex>
            </Flex>
          </Flex>
        </Flex>
      </form>
    </FormProvider>
  );
}
