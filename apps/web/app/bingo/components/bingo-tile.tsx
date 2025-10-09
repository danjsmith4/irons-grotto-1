'use client';

import { useState } from 'react';
import { Card, Flex, Separator, Table, Text, Badge, Dialog } from '@radix-ui/themes';
import { BingoTile } from '../types/bingo-tile';
import { formatWikiImageUrl } from '../utils/format-wiki-image-url';
import { EntityImage } from '../../rank-calculator/components/entity-image';
import { parseInitials } from '../../rank-calculator/utils/parse-initials';

interface BingoTileProps {
    tile: BingoTile;
}

export function BingoTileComponent({ tile }: BingoTileProps) {
    const [isOpen, setIsOpen] = useState(false);
    const imageUrl = tile.image ? formatWikiImageUrl(tile.image, 80) : '';

    const totalPoints = tile.tasks.reduce((sum, task) => sum + task.points, 0);
    const ironsGrottoPoints = tile.tasks
        .filter(task => task.ironsGrottoCompleted)
        .reduce((sum, task) => sum + task.points, 0);
    const ironDaddyPoints = tile.tasks
        .filter(task => task.ironDaddyCompleted)
        .reduce((sum, task) => sum + task.points, 0);

    return (
        <>
            <Card
                style={{ cursor: 'pointer', height: '100%' }}
                onClick={() => setIsOpen(true)}
            >
                <Flex direction="column" gap="3" p="3">
                    <Flex justify="between" align="center">
                        <Flex align="center" gap="3">
                            <EntityImage
                                alt={`${tile.header} icon`}
                                src={imageUrl}
                                size="4"
                                height={48}
                                width={48}
                                fallback={parseInitials(tile.header)}
                            />
                            <Text size="3" weight="bold">
                                {tile.header}
                            </Text>
                        </Flex>
                    </Flex>

                    <Flex justify="between" align="center">
                        <Flex direction="column" gap="1">
                            <Text size="2" color="green" weight="medium">
                                IG: {ironsGrottoPoints}pts
                            </Text>
                            <Text size="2" color="amber" weight="medium">
                                ID: {ironDaddyPoints}pts
                            </Text>
                        </Flex>
                        <Text size="2" color="blue">
                            View Tasks →
                        </Text>
                    </Flex>
                </Flex>
            </Card>

            <Dialog.Root open={isOpen} onOpenChange={setIsOpen}>
                <Dialog.Content maxWidth="500px">
                    <Dialog.Title>
                        <Flex align="center" gap="3">
                            <EntityImage
                                alt={`${tile.header} icon`}
                                src={imageUrl}
                                size="4"
                                height={48}
                                width={48}
                                fallback={parseInitials(tile.header)}
                            />
                            {tile.header}
                        </Flex>
                    </Dialog.Title>

                    <Dialog.Description size="2" mb="4">
                        Complete tasks to earn points and progress through the bingo!
                    </Dialog.Description>

                    <Separator size="4" mb="4" />

                    <Table.Root size="1">
                        <Table.Header>
                            <Table.Row>
                                <Text asChild weight="medium">
                                    <Table.ColumnHeaderCell>Task</Table.ColumnHeaderCell>
                                </Text>
                                <Text asChild weight="medium">
                                    <Table.ColumnHeaderCell align="right">
                                        Points
                                    </Table.ColumnHeaderCell>
                                </Text>
                                <Text asChild weight="medium">
                                    <Table.ColumnHeaderCell align="center">
                                        Iron's Grotto
                                    </Table.ColumnHeaderCell>
                                </Text>
                                <Text asChild weight="medium">
                                    <Table.ColumnHeaderCell align="center">
                                        Iron Daddy
                                    </Table.ColumnHeaderCell>
                                </Text>
                            </Table.Row>
                        </Table.Header>
                        <Table.Body>
                            {tile.tasks.map((task, index) => (
                                <Table.Row key={task.id}>
                                    <Table.Cell>
                                        <Flex direction="column" gap="1">
                                            <Text weight="medium" size="2">
                                                {index + 1}. {task.title}
                                            </Text>
                                            <Text size="1" color="gray">
                                                {task.description}
                                            </Text>
                                        </Flex>
                                    </Table.Cell>
                                    <Table.Cell align="right">
                                        <Text weight="medium" size="2">
                                            {task.points}
                                        </Text>
                                    </Table.Cell>
                                    <Table.Cell align="center">
                                        <Badge
                                            color={task.ironsGrottoCompleted ? 'green' : 'gray'}
                                            variant={task.ironsGrottoCompleted ? 'solid' : 'soft'}
                                        >
                                            {task.ironsGrottoCompleted ? '✓' : '○'}
                                        </Badge>
                                    </Table.Cell>
                                    <Table.Cell align="center">
                                        <Badge
                                            color={task.ironDaddyCompleted ? 'amber' : 'gray'}
                                            variant={task.ironDaddyCompleted ? 'solid' : 'soft'}
                                        >
                                            {task.ironDaddyCompleted ? '✓' : '○'}
                                        </Badge>
                                    </Table.Cell>
                                </Table.Row>
                            ))}
                        </Table.Body>
                    </Table.Root>

                    <Flex justify="between" align="center" mt="4" pt="3" style={{ borderTop: '1px solid var(--gray-a4)' }}>
                        <Flex direction="column" gap="1">
                            <Text size="2" weight="medium" color="green">
                                IG: {ironsGrottoPoints} / {totalPoints} points
                            </Text>
                            <Text size="2" weight="medium" color="amber">
                                ID: {ironDaddyPoints} / {totalPoints} points
                            </Text>
                        </Flex>
                        <Dialog.Close>
                            <Text size="2" color="blue" style={{ cursor: 'pointer' }}>
                                Close
                            </Text>
                        </Dialog.Close>
                    </Flex>
                </Dialog.Content>
            </Dialog.Root>
        </>
    );
}
