'use client';

import {
  Table,
  Avatar,
  Text,
  Flex,
  Box,
  Card,
  Heading,
  ScrollArea,
} from '@radix-ui/themes';
import Image from 'next/image';
import { getRankImageUrl } from '@/app/rank-calculator/utils/get-rank-image-url';
import { getRankName } from '@/app/rank-calculator/utils/get-rank-name';
import { Rank } from '@/config/enums';
import { clientConstants } from '@/config/constants.client';
import { formatTimeAgo } from '@/app/utils/format-time-ago';

interface RankUpData {
  id: string;
  playerName: string;
  oldRank: string | null;
  newRank: string;
  createdAt: Date;
}

interface RecentRankUpsProps {
  rankUps: RankUpData[];
}

function RankDisplay({ rank }: { rank: string | null; label: string }) {
  if (!rank) {
    return (
      <Flex align="center" gap="2">
        <Avatar size="2" fallback="?" />
        <Text size="2" color="gray">
          Unknown
        </Text>
      </Flex>
    );
  }

  const rankEnum = rank as Rank;
  const rankName = getRankName(rankEnum);
  const rankImageUrl = getRankImageUrl(rankEnum);

  return (
    <Flex align="center" gap="2">
      <Image
        src={rankImageUrl}
        alt={`${rankName} rank`}
        width={18}
        height={18}
        style={{ borderRadius: '50%' }}
      />
      <Text size="2">{rankName}</Text>
    </Flex>
  );
}

export function RecentRankUpsTable({ rankUps }: RecentRankUpsProps) {
  if (rankUps.length === 0) {
    return (
      <Card size="3">
        <Flex direction="column" align="center" py="6">
          <Text size="3" color="gray">
            No recent rank ups
          </Text>
          <Text size="2" color="gray">
            Rank ups will appear here when members get promoted
          </Text>
        </Flex>
      </Card>
    );
  }

  return (
    <Flex maxWidth={'500px'}>
      <Card size="3">
        <Box mb="3">
          <Heading size="4">Recent Rank Ups</Heading>
          <Text size="2" color="gray">
            Latest promotions within the clan
          </Text>
        </Box>

        <ScrollArea style={{ height: '400px' }}>
          <Table.Root>
            <Table.Header>
              <Table.Row>
                <Table.ColumnHeaderCell>Player</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell>From</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell>To</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell>When</Table.ColumnHeaderCell>
              </Table.Row>
            </Table.Header>

            <Table.Body>
              {rankUps.map((rankUp) => (
                <Table.Row key={rankUp.id}>
                  <Table.Cell>
                    <Flex align="center" gap="2">
                      <Text size="2" weight="medium">
                        <a
                          href={`${clientConstants.temple.baseUrl}/player/overview.php?player=${rankUp.playerName.toLowerCase()}`}
                        >
                          {rankUp.playerName}
                        </a>
                      </Text>
                    </Flex>
                  </Table.Cell>

                  <Table.Cell>
                    <RankDisplay rank={rankUp.oldRank} label="Previous rank" />
                  </Table.Cell>

                  <Table.Cell>
                    <RankDisplay rank={rankUp.newRank} label="New rank" />
                  </Table.Cell>

                  <Table.Cell>
                    <Text size="2" color="gray">
                      {formatTimeAgo(rankUp.createdAt)}
                    </Text>
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table.Root>
        </ScrollArea>
      </Card>
    </Flex>
  );
}
