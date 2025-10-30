import { useState, useEffect } from 'react';
import { Card, Table, Text, Badge, Flex } from '@radix-ui/themes';
import { PlayerStats, loadPlayerStatsAction } from '../actions/load-player-stats-action';

interface CompetitionTrackingProps {
    refreshTrigger?: number;
}

export function CompetitionTracking({ refreshTrigger }: CompetitionTrackingProps) {
    const [playerStats, setPlayerStats] = useState<{
        ironsGrotto: PlayerStats[];
        ironDaddy: PlayerStats[];
    }>({
        ironsGrotto: [],
        ironDaddy: []
    });
    const [loading, setLoading] = useState(true);

    const loadPlayerStats = async () => {
        try {
            setLoading(true);
            const result = await loadPlayerStatsAction();
            if (result.success) {
                setPlayerStats(result.playerStats);
            } else {
                console.error('Failed to load player stats:', result.error);
            }
        } catch (error) {
            console.error('Failed to load player stats:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        void loadPlayerStats();
    }, [refreshTrigger]);

    if (loading) {
        return (
            <Flex justify="center" align="center" py="6">
                <Text size="3" color="gray">
                    Loading player statistics...
                </Text>
            </Flex>
        );
    }

    const renderPlayerList = (players: PlayerStats[], teamName: string, teamColor: 'blue' | 'red') => {
        if (players.length === 0) {
            return (
                <Flex justify="center" align="center" py="4">
                    <Text size="2" color="gray">
                        No contributions yet
                    </Text>
                </Flex>
            );
        }


        return (
            <Table.Root size="2">
                <Table.Header>
                    <Table.Row>
                        <Text asChild weight="bold">
                            <Table.ColumnHeaderCell>Rank</Table.ColumnHeaderCell>
                        </Text>
                        <Text asChild weight="bold">
                            <Table.ColumnHeaderCell>Player</Table.ColumnHeaderCell>
                        </Text>
                        <Text asChild weight="bold">
                            <Table.ColumnHeaderCell align="center">Points</Table.ColumnHeaderCell>
                        </Text>
                        <Text asChild weight="bold">
                            <Table.ColumnHeaderCell align="center">Completions</Table.ColumnHeaderCell>
                        </Text>
                    </Table.Row>
                </Table.Header>
                <Table.Body>
                    {players.map((player, index) => {
                        const isMvp = index === 0;
                        const rank = index + 1;
                        
                        return (
                            <Table.Row key={player.user}>
                                <Table.Cell>
                                    <Text size="2" weight="medium">
                                        {rank}
                                    </Text>
                                </Table.Cell>
                                <Table.Cell>
                                    <Flex align="center" gap="2">
                                        {isMvp && (
                                            <Text size="3">👑</Text>
                                        )}
                                        <Text 
                                            size={isMvp ? "3" : "2"} 
                                            weight={isMvp ? "bold" : "medium"}
                                        >
                                            {player.user}
                                        </Text>
                                        {isMvp && (
                                            <Badge color={teamColor} variant="solid" size="1">
                                                MVP
                                            </Badge>
                                        )}
                                    </Flex>
                                </Table.Cell>
                                <Table.Cell align="center">
                                    <Text 
                                        size={isMvp ? "3" : "2"} 
                                        weight={isMvp ? "bold" : "medium"}
                                    >
                                        {player.points}
                                    </Text>
                                </Table.Cell>
                                <Table.Cell align="center">
                                    <Text 
                                        size={isMvp ? "3" : "2"} 
                                        weight={isMvp ? "bold" : "medium"}
                                    >
                                        {player.completions}
                                    </Text>
                                </Table.Cell>
                            </Table.Row>
                        );
                    })}
                </Table.Body>
            </Table.Root>
        );
    };

    return (
        <Flex direction="column" gap="4" mt="4">
            <Flex direction={{ initial: 'column', md: 'row' }} gap="4">
                {/* Irons Grotto Leaderboard */}
                <Card style={{ flex: 1 }}>
                    <Flex direction="column" gap="3" p="4">
                        <Flex align="center" justify="center" gap="2">
                            <Text size="4" weight="bold" style={{ color: 'var(--blue-11)' }}>
                                Irons Grotto
                            </Text>
                            <Badge color="blue" variant="outline" size="2">
                                {playerStats.ironsGrotto.length} players
                            </Badge>
                        </Flex>
                        {renderPlayerList(playerStats.ironsGrotto, 'Irons Grotto', 'blue')}
                    </Flex>
                </Card>

                {/* Iron Daddy Leaderboard */}
                <Card style={{ flex: 1 }}>
                    <Flex direction="column" gap="3" p="4">
                        <Flex align="center" justify="center" gap="2">
                            <Text size="4" weight="bold" style={{ color: 'var(--red-11)' }}>
                                Iron Daddy
                            </Text>
                            <Badge color="red" variant="outline" size="2">
                                {playerStats.ironDaddy.length} players
                            </Badge>
                        </Flex>
                        {renderPlayerList(playerStats.ironDaddy, 'Iron Daddy', 'red')}
                    </Flex>
                </Card>
            </Flex>

            {/* Competition Summary */}
            <Card>
                <Flex direction="column" gap="3" p="4">
                    <Text size="3" weight="bold" align="center">
                        Competition Summary
                    </Text>
                    <Flex justify="center" gap="6">
                        <Flex direction="column" align="center" gap="1">
                            <Text size="2" color="gray">Total Points</Text>
                            <Flex gap="4">
                                <Flex align="center" gap="2">
                                    <Badge color="blue" variant="solid">
                                        {playerStats.ironsGrotto.reduce((sum, p) => sum + p.points, 0).toFixed(1)}
                                    </Badge>
                                    <Text size="2" color="gray">vs</Text>
                                    <Badge color="red" variant="solid">
                                        {playerStats.ironDaddy.reduce((sum, p) => sum + p.points, 0).toFixed(1)}
                                    </Badge>
                                </Flex>
                            </Flex>
                        </Flex>
                        <Flex direction="column" align="center" gap="1">
                            <Text size="2" color="gray">Total Completions</Text>
                            <Flex gap="4">
                                <Flex align="center" gap="2">
                                    <Badge color="blue" variant="outline">
                                        {playerStats.ironsGrotto.reduce((sum, p) => sum + p.completions, 0)}
                                    </Badge>
                                    <Text size="2" color="gray">vs</Text>
                                    <Badge color="red" variant="outline">
                                        {playerStats.ironDaddy.reduce((sum, p) => sum + p.completions, 0)}
                                    </Badge>
                                </Flex>
                            </Flex>
                        </Flex>
                    </Flex>
                </Flex>
            </Card>
        </Flex>
    );
}