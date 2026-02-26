'use client';

import { useState } from 'react';
import {
  Table,
  Text,
  Flex,
  Box,
  Card,
  Heading,
  ScrollArea,
  Avatar,
} from '@radix-ui/themes';
import Image from 'next/image';
import { formatWikiImageUrl } from '@/app/rank-calculator/utils/format-wiki-url';
import { formatTimeAgo } from '@/app/utils/format-time-ago';
import { clientConstants } from '@/config/constants.client';

interface ClogUpdateData {
  id: string;
  playerName: string;
  itemName: string;
  itemId: number;
  count: number;
  dateFirstLogged: Date;
}

interface RecentClogUpdatesProps {
  clogUpdates: ClogUpdateData[];
}

function ItemImageWithFallback({ itemName }: { itemName: string }) {
  const [hasError, setHasError] = useState(false);

  if (hasError) {
    return (
      <Avatar size="1" fallback="?" style={{ width: '20px', height: '20px' }} />
    );
  }

  return (
    <Image
      src={formatWikiImageUrl(itemName)}
      alt={itemName}
      width={20}
      height={20}
      style={{
        borderRadius: '2px',
        imageRendering: 'pixelated',
      }}
      onError={() => setHasError(true)}
    />
  );
}

export function RecentClogUpdatesTable({
  clogUpdates,
}: RecentClogUpdatesProps) {
  if (clogUpdates.length === 0) {
    return (
      <Card size="3">
        <Flex direction="column" align="center" py="6">
          <Text size="3" color="gray">
            No recent collection log updates
          </Text>
          <Text size="2" color="gray">
            Collection log updates will appear here when members log new items
          </Text>
        </Flex>
      </Card>
    );
  }

  return (
    <Card size="3">
      <Box mb="3">
        <Heading size="4">Recent Collection Log Updates</Heading>
        <Text size="2" color="gray">
          Latest items logged by clan members
        </Text>
      </Box>

      <ScrollArea style={{ height: '400px' }}>
        <Table.Root>
          <Table.Header>
            <Table.Row>
              <Table.ColumnHeaderCell>Player</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>Item</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>When</Table.ColumnHeaderCell>
            </Table.Row>
          </Table.Header>

          <Table.Body>
            {clogUpdates.map((update) => (
              <Table.Row key={update.id}>
                <Table.Cell>
                  <Flex align="center" gap="2">
                    <Text size="2" weight="medium">
                      <a
                        href={`${clientConstants.temple.baseUrl}/player/overview.php?player=${update.playerName.toLowerCase()}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          color: 'var(--theme-tertiary)',
                          textDecoration: 'none',
                        }}
                      >
                        {update.playerName}
                      </a>
                    </Text>
                  </Flex>
                </Table.Cell>

                <Table.Cell>
                  <Flex align="center" gap="2">
                    <ItemImageWithFallback itemName={update.itemName} />
                    <Text size="2">{update.itemName}</Text>
                  </Flex>
                </Table.Cell>

                <Table.Cell>
                  <Text size="2" color="gray">
                    {formatTimeAgo(update.dateFirstLogged)}
                  </Text>
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table.Root>
      </ScrollArea>
    </Card>
  );
}
