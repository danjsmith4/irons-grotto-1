'use client';

import { Player } from '@/app/schemas/player';
import { useOptimisticAction } from 'next-safe-action/hooks';
import {
  Box,
  Card,
  Flex,
  Heading,
  IconButton,
  Text,
  Tooltip,
} from '@radix-ui/themes';
import { format } from 'date-fns';
import { ChevronRightIcon, Pencil1Icon } from '@radix-ui/react-icons';
import { toast } from 'react-toastify';
import Link from 'next/link';
import { deletePlayerAccountAction } from './actions/delete-player-account-action';
import { DeleteSubmissionButton } from './components/delete-submission-button';
import { IronsButton } from './components/irons-button';

interface PlayerListProps {
  accounts: Record<string, Player>;
}

export function PlayerList({ accounts }: PlayerListProps) {
  const { execute, optimisticState } = useOptimisticAction(
    deletePlayerAccountAction,
    {
      currentState: accounts,
      updateFn(state, id) {
        const { [id]: _removedAccount, ...newAccounts } = state;

        return newAccounts;
      },
      onError({ error: { serverError } }) {
        if (serverError) {
          toast.error(serverError);
        }
      },
    },
  );

  return (
    <Flex
      height="100vh"
      align="center"
      justify="center"
      gap="6"
      direction="column"
    >
      <Heading size="5" style={{ color: 'rgb(var(--ig-text-light))' }}>
        Irons Grotto Rank Calculator
      </Heading>
      <Flex direction="column" gap="4" width="330px">
        {Object.values(optimisticState).map(
          ({ rsn, joinDate, isNameInvalid }) => (
            <Card
              key={rsn}
              style={{
                background: 'rgb(var(--ig-surface-2) / 0.6)',
                border: '1px solid rgb(var(--ig-secondary) / 0.2)',
                backdropFilter: 'blur(10px)',
                transition: 'all 0.3s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'rgb(var(--ig-secondary) / 0.4)';
                e.currentTarget.style.boxShadow =
                  '0 4px 20px rgb(var(--ig-secondary) / 0.3)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'rgb(var(--ig-secondary) / 0.2)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <Flex align="center" justify="between">
                <Box>
                  <Text as="p" weight="bold">
                    {rsn}
                  </Text>
                  <Text as="p" size="2" color="gray">
                    Joined {format(joinDate, 'dd MMM yyyy')}
                  </Text>
                </Box>
                <Flex gap="2">
                  <DeleteSubmissionButton
                    deletePlayerAccountAction={execute}
                    playerName={rsn}
                  />
                  <Tooltip content="Edit">
                    <IconButton asChild variant="soft" color="gray">
                      <Link
                        href={`/player/${rsn.toLowerCase()}/edit`}
                      >
                        <Pencil1Icon />
                      </Link>
                    </IconButton>
                  </Tooltip>
                  <Tooltip content="Go to calculator">
                    <IconButton asChild disabled={isNameInvalid}>
                      <Link
                        href={`/player/${rsn.toLowerCase()}`}
                        style={{
                          ...(isNameInvalid
                            ? {
                                pointerEvents: 'none',
                              }
                            : {}),
                        }}
                      >
                        <ChevronRightIcon />
                      </Link>
                    </IconButton>
                  </Tooltip>
                </Flex>
              </Flex>
            </Card>
          ),
        )}
        <Flex gap="3">
          <IronsButton asChild variant="primary" size="3" style={{ flex: 1 }}>
            <Link href="/join">Add new player</Link>
          </IronsButton>
          <IronsButton asChild variant="secondary" size="3" style={{ flex: 1 }}>
            <Link href="/bingo">Bingo Board</Link>
          </IronsButton>
        </Flex>
      </Flex>
    </Flex>
  );
}
