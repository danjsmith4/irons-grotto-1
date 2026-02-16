import { Flex, Separator, Text, TextProps } from '@radix-ui/themes';
import {
  CheckIcon,
  Cross2Icon,
  ExclamationTriangleIcon,
} from '@radix-ui/react-icons';
import { z } from 'zod';
import { DataCard } from '../data-card';
import { useModeration } from '../../contexts/moderation-context';

const DataStatus = z.enum(['present', 'outdated', 'missing']);

const statusColors = {
  [DataStatus.enum.present]: 'green',
  [DataStatus.enum.outdated]: 'orange',
  [DataStatus.enum.missing]: 'red',
} satisfies Record<z.infer<typeof DataStatus>, TextProps['color']>;

const statusIcons = {
  [DataStatus.enum.present]: <CheckIcon height={20} width={20} />,
  [DataStatus.enum.outdated]: (
    <ExclamationTriangleIcon height={18} width={18} />
  ),
  [DataStatus.enum.missing]: <Cross2Icon height={20} width={20} />,
} as const;

export function ModerationCard() {
  const {
    hasTemplePlayerStats,
    hasTempleCollectionLog,
    hasWikiSyncData,
    isModerator,
    actionedByUsername,
    isTempleCollectionLogOutdated,
    playerName,
    dataFreshnessInfo,
  } = useModeration();

  if (!isModerator) {
    return null;
  }

  function getDataSourceStatus(
    isDataSourcePresent: boolean,
    isDataSourceOutdated?: boolean,
  ) {
    if (!isDataSourceOutdated) {
      return DataStatus.enum[isDataSourcePresent ? 'present' : 'missing'];
    }

    return DataStatus.enum[isDataSourcePresent ? 'outdated' : 'missing'];
  }

  const moderationData = [
    ['TempleOSRS player stats', getDataSourceStatus(hasTemplePlayerStats)],
    [
      'TempleOSRS collection log',
      getDataSourceStatus(
        hasTempleCollectionLog,
        isTempleCollectionLogOutdated,
      ),
    ],
    ['WikiSync data', getDataSourceStatus(hasWikiSyncData)],
  ] as const;

  return (
    <DataCard.Root>
      <DataCard.Row
        left={
          <Flex gap="2" align="center">
            <Text role="heading" weight="medium" size="2">
              Moderator info
            </Text>
            {dataFreshnessInfo?.isUsingFreshData && (
              <Text size="1" color="blue" style={{ fontStyle: 'italic' }}>
                (current data)
              </Text>
            )}
          </Flex>
        }
        right={null}
      />
      <Separator size="4" />
      {dataFreshnessInfo?.hasTempleCollectionLogStatusChanged && (
        <DataCard.Row
          left={
            <Text size="2" color="orange">
              ⚠️ Collection log status changed since submission
            </Text>
          }
          right={null}
        />
      )}
      {dataFreshnessInfo?.hasOtherDataChanged && (
        <DataCard.Row
          left={
            <Text size="2" color="blue">
              ℹ️ Other data sources changed since submission
            </Text>
          }
          right={null}
        />
      )}
      {moderationData.map(([label, status]) => (
        <DataCard.Row
          key={label}
          left={
            <Text color={statusColors[status]} size="2">
              {label}
            </Text>
          }
          right={
            <Text color={statusColors[status]}>{statusIcons[status]}</Text>
          }
        />
      ))}{' '}
      <DataCard.Row
        left={<Text size="2">Player name</Text>}
        right={<Text size="2">{playerName}</Text>}
      />{' '}
      {actionedByUsername && (
        <DataCard.Row
          left={<Text size="2">Actioned by</Text>}
          right={<Text size="2">{actionedByUsername}</Text>}
        />
      )}
    </DataCard.Root>
  );
}
