'use client';

import { Grid, Text, Card, Flex, Table, Badge, Separator } from '@radix-ui/themes';
import { BingoBoard } from '../types/bingo-tile';
import { BingoTileComponent } from './bingo-tile';
import { CompletionTable } from './completion-table';
import { loadClanCompletions, applyClanCompletions, calculateClanProgress, getClanColor } from '../utils/clan-completions';

interface BingoBoardProps {
    board: BingoBoard;
}

export function BingoBoardComponent({ board }: BingoBoardProps) {
    const gridSize = board.gridSize || Math.ceil(Math.sqrt(board.tiles.length));

    // Load clan completions and apply to board
    const completions = loadClanCompletions();
    const updatedBoard = applyClanCompletions(board, completions);

    // Calculate progress for both clans
    const ironsGrottoProgress = calculateClanProgress(updatedBoard, 'ironsGrotto');
    const ironDaddyProgress = calculateClanProgress(updatedBoard, 'ironDaddy');

    return (
        <Flex direction="column" gap="4">
            {/* Header */}
            <Card>
                <Flex direction="column" gap="4" p="4">
                    <Text size="5" weight="bold" align="center">
                        {board.title}
                    </Text>

                    {/* Clan Progress Overview */}
                    <Flex justify="center" gap="8">
                        <Flex direction="column" align="center" gap="2">
                            <Text size="2" color="gray" weight="medium">Iron's Grotto</Text>
                            <Badge color="green" size="2">
                                {ironsGrottoProgress.earnedPoints} / {ironsGrottoProgress.totalPoints} pts
                            </Badge>
                            <Text size="3" weight="bold" style={{ color: getClanColor('ironsGrotto') }}>
                                {ironsGrottoProgress.progressPercentage}%
                            </Text>
                        </Flex>

                        <Separator orientation="vertical" />

                        <Flex direction="column" align="center" gap="2">
                            <Text size="2" color="gray" weight="medium">Iron Daddy</Text>
                            <Badge color="amber" size="2">
                                {ironDaddyProgress.earnedPoints} / {ironDaddyProgress.totalPoints} pts
                            </Badge>
                            <Text size="3" weight="bold" style={{ color: getClanColor('ironDaddy') }}>
                                {ironDaddyProgress.progressPercentage}%
                            </Text>
                        </Flex>
                    </Flex>

                    {/* Overall Stats */}
                    <Separator size="4" />
                    <Flex justify="center" gap="6">
                        <Flex direction="column" align="center" gap="1">
                            <Text size="2" color="gray">Total Tiles</Text>
                            <Text size="4" weight="bold">{board.tiles.length}</Text>
                        </Flex>
                        <Flex direction="column" align="center" gap="1">
                            <Text size="2" color="gray">Total Tasks</Text>
                            <Text size="4" weight="bold">{ironsGrottoProgress.totalTasks}</Text>
                        </Flex>
                        <Flex direction="column" align="center" gap="1">
                            <Text size="2" color="gray">Total Points</Text>
                            <Text size="4" weight="bold">{ironsGrottoProgress.totalPoints}</Text>
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
                {updatedBoard.tiles.map((tile) => (
                    <BingoTileComponent key={tile.id} tile={tile} />
                ))}
            </Grid>

            {/* Completion Tracking Table */}
            <CompletionTable board={board} />
        </Flex>
    );
}
