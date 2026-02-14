import { ReactNode } from 'react';
import { Box, Flex, IconButton, Text } from '@radix-ui/themes';
import Image from 'next/image';
import Link from 'next/link';
import { ChevronLeftIcon } from '@radix-ui/react-icons';
import { useRank } from '../hooks/use-rank';
import { useRankCalculator } from '../hooks/point-calculator/use-rank-calculator';
import { getRankName } from '../utils/get-rank-name';
import { formatNumber } from '../utils/format-number';
import { getRankImageUrl } from '../utils/get-rank-image-url';
import { useCurrentPlayer } from '../contexts/current-player-context';

interface NavigationProps {
  actions: ReactNode;
  shouldRenderBackButton: boolean;
}

export function Navigation({
  actions,
  shouldRenderBackButton,
}: NavigationProps) {
  const { pointsAwarded } = useRankCalculator();
  const { playerName } = useCurrentPlayer();
  const { rank } = useRank(pointsAwarded, playerName);
  const rankName = getRankName(rank);

  return (
    <Box
      asChild
      p="3"
      gridArea="nav"
      position={{
        initial: 'fixed',
        md: 'static',
      }}
      right={{
        initial: '0',
        md: 'auto',
      }}
      left={{
        initial: '0',
        md: 'auto',
      }}
      style={{
        background: 'rgba(45, 27, 78, 0.95)',
        borderBottom: '1px solid rgba(233, 30, 99, 0.3)',
        zIndex: 100,
        backdropFilter: 'blur(10px)',
      }}
    >
      <Flex align="center" justify="between" asChild>
        <nav role="navigation">
          <Flex gap="3" align="center">
            {shouldRenderBackButton && (
              <IconButton asChild color="gray" variant="soft">
                <Link href="/rank-calculator">
                  <ChevronLeftIcon />
                </Link>
              </IconButton>
            )}
            <Text
              size="2"
              as="div"
              style={{
                // @ts-expect-error CSS variable isn't a property
                '--line-height': 'normal',
              }}
            >
              <Flex align="center" gap="1">
                <Text weight="medium">Rank:</Text>{' '}
                <Text color="gray">{rankName}</Text>
                <Box asChild display="inline-block">
                  <Image
                    alt={`${rank} icon`}
                    src={getRankImageUrl(rank)}
                    width={18}
                    height={18}
                    unoptimized
                  />
                </Box>
              </Flex>
              <Text as="div">
                <Text weight="medium">Points:</Text>{' '}
                <Text color="gray">{formatNumber(pointsAwarded)}</Text>
              </Text>
            </Text>
          </Flex>
          <Flex align="center" justify="end" gap="2">
            {actions}
          </Flex>
        </nav>
      </Flex>
    </Box>
  );
}
