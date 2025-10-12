'use client';

import { Card, Table, Text, Badge, Flex, Separator } from '@radix-ui/themes';
import { BingoBoard } from '../types/bingo-tile';

interface CompletionTableProps {
    board: BingoBoard;
}

export function CompletionTable({ board }: CompletionTableProps) {
    // Flatten all tasks with their tile information (board should already have completions applied)
    const allTasks = board.tiles.flatMap(tile =>
        tile.tasks.map(task => ({
            ...task,
            tileHeader: tile.header,
            tileId: tile.id,
        }))
    );

    return (
        <Card>
            <Flex direction="column" gap="4" p="4">
                <Text size="4" weight="bold" align="center">
                    Clan vs Clan Progress Tracker
                </Text>

                <Separator size="4" />

                <Table.Root size="2">
                    <Table.Header>
                        <Table.Row>
                            <Text asChild weight="bold">
                                <Table.ColumnHeaderCell>Tile</Table.ColumnHeaderCell>
                            </Text>
                            <Text asChild weight="bold">
                                <Table.ColumnHeaderCell>Task</Table.ColumnHeaderCell>
                            </Text>
                            <Text asChild weight="bold">
                                <Table.ColumnHeaderCell align="right">Points</Table.ColumnHeaderCell>
                            </Text>
                            <Text asChild weight="bold">
                                <Table.ColumnHeaderCell align="center">Iron's Grotto</Table.ColumnHeaderCell>
                            </Text>
                            <Text asChild weight="bold">
                                <Table.ColumnHeaderCell align="center">Iron Daddy</Table.ColumnHeaderCell>
                            </Text>
                        </Table.Row>
                    </Table.Header>
                    <Table.Body>
                        {allTasks.map((task) => (
                            <Table.Row key={task.id}>
                                <Table.Cell>
                                    <Text size="2" weight="medium">
                                        {task.tileHeader}
                                    </Text>
                                </Table.Cell>
                                <Table.Cell>
                                    <Flex direction="column" gap="1">
                                        <Text size="2" weight="medium">
                                            {task.title}
                                        </Text>
                                        <Text size="1" color="gray">
                                            {task.description}
                                        </Text>
                                    </Flex>
                                </Table.Cell>
                                <Table.Cell align="right">
                                    <Text size="2" weight="medium">
                                        {task.points}
                                    </Text>
                                </Table.Cell>
                                <Table.Cell align="center">
                                    <Badge
                                        color={task.ironsGrottoCompleted ? 'green' : 'gray'}
                                        variant={task.ironsGrottoCompleted ? 'solid' : 'soft'}
                                        size="2"
                                    >
                                        {task.ironsGrottoCompleted ? '✓ Completed' : '○ Pending'}
                                    </Badge>
                                </Table.Cell>
                                <Table.Cell align="center">
                                    <Badge
                                        color={task.ironDaddyCompleted ? 'amber' : 'gray'}
                                        variant={task.ironDaddyCompleted ? 'solid' : 'soft'}
                                        size="2"
                                    >
                                        {task.ironDaddyCompleted ? '✓ Completed' : '○ Pending'}
                                    </Badge>
                                </Table.Cell>
                            </Table.Row>
                        ))}
                    </Table.Body>
                </Table.Root>
            </Flex>
        </Card>
    );
}
