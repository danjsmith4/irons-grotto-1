'use client';

import { Grid, Text, Card, Flex, Badge, Separator } from '@radix-ui/themes';
import { BingoBoard } from '../types/bingo-tile';
import { BingoTileComponent } from './bingo-tile';
import { CompletionTable } from './completion-table';
import { calculateClanProgress, getClanColor } from '../utils/clan-completions';
import { loadMvpAction } from '../actions/load-mvp-action';
import { useEffect, useState, useRef } from 'react';
import { mvp } from '@/lib/db/completions';

interface BingoBoardProps {
    board: BingoBoard;
    onRefresh?: () => Promise<void>;
}

export function BingoBoardComponent({ board, onRefresh }: BingoBoardProps) {
    const gridSize = board.gridSize || Math.ceil(Math.sqrt(board.tiles.length));
    
    // State for MVP data
    const [mvps, setMvps] = useState<{
        ironsGrotto: mvp | null;
        ironDaddy: mvp | null;
    }>({
        ironsGrotto: null,
        ironDaddy: null
    });
    const [isLoadingMvps, setIsLoadingMvps] = useState(true);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);

    // Load MVP data on component mount
    useEffect(() => {
        const loadMvps = async () => {
            setIsLoadingMvps(true);
            const result = await loadMvpAction();
            if (result.success) {
                setMvps(result.mvps);
            }
            setIsLoadingMvps(false);
        };

        void loadMvps();
    }, []);

    // Set up polling for data refresh every 15 seconds
    useEffect(() => {
        const refreshData = async () => {
            try {
                // Refresh MVP data
                const mvpResult = await loadMvpAction();
                if (mvpResult.success) {
                    setMvps(mvpResult.mvps);
                }

                // Refresh board data if callback is provided
                if (onRefresh) {
                    await onRefresh();
                }
            } catch (error) {
                console.error('Error refreshing bingo board data:', error);
            }
        };

        // Set up interval for polling every 15 seconds
        intervalRef.current = setInterval(refreshData, 15000);

        // Cleanup interval on unmount
        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        };
    }, [onRefresh]);

    // Calculate progress for both clans (board should already have completions applied)
    const ironsGrottoProgress = calculateClanProgress(board, 'ironsGrotto');
    const ironDaddyProgress = calculateClanProgress(board, 'ironDaddy');

    return (
        <Flex direction="column" gap="4">
            {/* Header */}
            <Card>
                <Flex direction="column" gap="4" p="4">

                    {/* Clan Progress Overview */}
                    <Flex justify="center" gap="8">
                        <Flex direction="column" align="center" gap="2">
                            <Text size="2" color="gray" weight="medium">Iron's Grotto</Text>
                            <Badge 
                                color="green" 
                                size="3"
                                style={{ 
                                    fontSize: '1rem', 
                                    padding: '8px 12px',
                                    fontWeight: '600'
                                }}
                            >
                                {ironsGrottoProgress.earnedPoints} / {ironsGrottoProgress.totalPoints} pts
                            </Badge>
                            <Text size="3" weight="bold" style={{ color: getClanColor('ironsGrotto') }}>
                                {ironsGrottoProgress.progressPercentage}%
                            </Text>
                        </Flex>

                        <Separator orientation="vertical" />

                        <Flex direction="column" align="center" gap="2">
                            <Text size="2" color="gray" weight="medium">Iron Daddy</Text>
                            <Badge 
                                color="amber" 
                                size="3"
                                style={{ 
                                    fontSize: '1rem', 
                                    padding: '8px 12px',
                                    fontWeight: '600'
                                }}
                            >
                                {ironDaddyProgress.earnedPoints} / {ironDaddyProgress.totalPoints} pts
                            </Badge>
                            <Text size="3" weight="bold" style={{ color: getClanColor('ironDaddy') }}>
                                {ironDaddyProgress.progressPercentage}%
                            </Text>
                        </Flex>
                    </Flex>
                    {/* MVP Stats */}
                    <Separator size="4" />
                    <Flex justify="center" gap="8">
                        <Flex direction="column" align="center" gap="1">
                            <Text size="2" color="gray" weight="medium">Iron's Grotto MVP</Text>
                            {isLoadingMvps ? (
                                <Text size="3" color="gray">Loading...</Text>
                            ) : mvps.ironsGrotto ? (
                                <Flex direction="column" align="center" gap="1">
                                    <Text size="3" weight="bold" style={{ color: getClanColor('ironsGrotto') }}>
                                        {mvps.ironsGrotto.user}
                                    </Text>
                                    <Text size="2" color="gray">
                                        {mvps.ironsGrotto.points} pts • {mvps.ironsGrotto.completions} task{mvps.ironsGrotto.completions === 1 ? '' : 's'} completed
                                    </Text>
                                </Flex>
                            ) : (
                                <Text size="3" color="gray">None</Text>
                            )}
                        </Flex>

                        <Separator orientation="vertical" />

                        <Flex direction="column" align="center" gap="1">
                            <Text size="2" color="gray" weight="medium">Iron Daddy MVP</Text>
                            {isLoadingMvps ? (
                                <Text size="3" color="gray">Loading...</Text>
                            ) : mvps.ironDaddy ? (
                                <Flex direction="column" align="center" gap="1">
                                    <Text size="3" weight="bold" style={{ color: getClanColor('ironDaddy') }}>
                                        {mvps.ironDaddy.user}
                                    </Text>
                                    <Text size="2" color="gray">
                                        {mvps.ironDaddy.points} pts • {mvps.ironDaddy.completions} task{mvps.ironDaddy.completions === 1 ? '' : 's'} completed
                                    </Text>
                                </Flex>
                            ) : (
                                <Text size="3" color="gray">None</Text>
                            )}
                        </Flex>
                    </Flex>
                </Flex>
            </Card>

            {/* Bingo Grid */}
            <Grid
                columns={{
                    initial: '1',
                    sm: '2',
                    md: '3',
                    lg: gridSize.toString(),
                }}
                gap="4"
                width="100%"
            >
                {board.tiles.map((tile) => (
                    <BingoTileComponent key={tile.id} tile={tile} />
                ))}
            </Grid>

            {/* Completion Tracking Table */}
            <CompletionTable board={board} />
        </Flex>
    );
}
