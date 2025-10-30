'use client';

import { useState, useEffect } from 'react';
import { Card, Table, Text, Badge, Flex, Button, Tabs } from '@radix-ui/themes';
import { BingoBoard } from '../types/bingo-tile';
import { loadCompletionsPaginatedAction } from '../actions/load-completions-paginated-action';
import { ProgressGraph } from './progress-graph';
import { CompetitionTracking } from './competition-tracking';
import type { BingoCompletion } from '@/lib/db/schema';

interface CompletionTableProps {
    board: BingoBoard;
    refreshTrigger?: number;
}

interface CompletionWithTask extends BingoCompletion {
    taskTitle?: string;
    taskDescription?: string;
    tileHeader?: string;
    components?: number;
}

interface TaskMapEntry {
    title: string;
    description: string;
    tileHeader: string;
    components?: number;
}

export function CompletionTable({ board, refreshTrigger }: CompletionTableProps) {
    const [completions, setCompletions] = useState<CompletionWithTask[]>([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [hasMore, setHasMore] = useState(false);
    const [loading, setLoading] = useState(false);

    // Create a map of task IDs to task details for quick lookup
    const taskMap = new Map<string, TaskMapEntry>();
    board.tiles.forEach(tile => {
        tile.tasks.forEach(task => {
            taskMap.set(task.id, {
                title: task.title,
                description: task.description,
                tileHeader: tile.header,
                components: task.components
            });
        });
    });

    const loadCompletions = async (page: number, append = false) => {
        setLoading(true);
        try {
            console.log('Loading completions for page:', page);
            const result = await loadCompletionsPaginatedAction(page, 10);
            console.log('Completions result:', result);
            
            if (result.success) {
        // Enrich completions with task details
        const enrichedCompletions = result.completions.map(completion => {
            const taskInfo = taskMap.get(completion.taskId);
            return {
                ...completion,
                taskTitle: taskInfo?.title,
                taskDescription: taskInfo?.description,
                tileHeader: taskInfo?.tileHeader,
                components: taskInfo?.components,
            };
        });                console.log('Enriched completions:', enrichedCompletions);

                if (append) {
                    setCompletions(prev => [...prev, ...enrichedCompletions]);
                } else {
                    setCompletions(enrichedCompletions);
                }
                setHasMore(result.hasMore);
            } else {
                console.error('Failed to load completions:', result.error);
            }
        } catch (error) {
            console.error('Failed to load completions:', error);
        } finally {
            setLoading(false);
        }
    };

    // Load initial completions
    useEffect(() => {
        void loadCompletions(1);
    }, []);

    const handleShowMore = () => {
        const nextPage = currentPage + 1;
        setCurrentPage(nextPage);
        void loadCompletions(nextPage, true);
    };

    const formatDate = (date: Date) => {
        return new Intl.DateTimeFormat(undefined, {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            timeZoneName: 'short',
        }).format(new Date(date));
    };

    const getClanColor = (clan: string) => {
        return clan === 'ironsGrotto' ? 'green' : 'amber';
    };

    const getClanName = (clan: string) => {
        return clan === 'ironsGrotto' ? "Iron's Grotto" : 'Iron Daddy';
    };

    return (
        <Card>
            <Flex direction="column" gap="4" p="4">
                <Text size="4" weight="bold" align="center">
                    Competition Tracking
                </Text>

                <Tabs.Root defaultValue="completions">
                    <Tabs.List>
                        <Tabs.Trigger value="completions">Latest Completions</Tabs.Trigger>
                        <Tabs.Trigger value="leaderboard">Leaderboard</Tabs.Trigger>
                        <Tabs.Trigger value="progress">Progress Graph</Tabs.Trigger>
                    </Tabs.List>

                    <Tabs.Content value="completions">
                        <Flex direction="column" gap="4" mt="4">
                            <Table.Root size="2">
                                <Table.Header>
                                    <Table.Row>
                                        <Text asChild weight="bold">
                                            <Table.ColumnHeaderCell>User</Table.ColumnHeaderCell>
                                        </Text>
                                        <Text asChild weight="bold">
                                            <Table.ColumnHeaderCell>Task</Table.ColumnHeaderCell>
                                        </Text>
                                        <Text asChild weight="bold">
                                            <Table.ColumnHeaderCell>Clan</Table.ColumnHeaderCell>
                                        </Text>
                                        <Text asChild weight="bold">
                                            <Table.ColumnHeaderCell>Completed</Table.ColumnHeaderCell>
                                        </Text>
                                        <Text asChild weight="bold">
                                            <Table.ColumnHeaderCell align="center">Proof</Table.ColumnHeaderCell>
                                        </Text>
                                    </Table.Row>
                                </Table.Header>
                                <Table.Body>
                                    {completions.map((completion) => (
                                        <Table.Row key={completion.id}>
                                            <Table.Cell>
                                                <Text size="2" weight="medium">
                                                    {completion.user}
                                                </Text>
                                            </Table.Cell>
                                            <Table.Cell>
                                                <Flex direction="column" gap="1">
                                                    <Flex align="center" gap="2">
                                                        <Text size="2" weight="medium">
                                                            {completion.taskTitle ?? completion.taskId}
                                                        </Text>
                                                        {completion.components && (
                                                            <Badge variant="soft" color="blue" size="1">
                                                                Component-based
                                                            </Badge>
                                                        )}
                                                    </Flex>
                                                    {completion.taskDescription && (
                                                        <Text size="1" color="gray">
                                                            {completion.taskDescription}
                                                        </Text>
                                                    )}
                                                    {completion.components && (
                                                        <Text size="1" color="gray">
                                                            {completion.tileHeader} • Requires {completion.components} components
                                                        </Text>
                                                    )}
                                                </Flex>
                                            </Table.Cell>
                                            <Table.Cell>
                                                <Badge
                                                    color={getClanColor(completion.clan)}
                                                    variant="soft"
                                                    size="2"
                                                >
                                                    {getClanName(completion.clan)}
                                                </Badge>
                                            </Table.Cell>
                                            <Table.Cell>
                                                <Text size="2" color="gray">
                                                    {formatDate(completion.createdAt)}
                                                </Text>
                                            </Table.Cell>
                                            <Table.Cell align="center">
                                                <a
                                                    href={completion.proof}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    style={{
                                                        color: 'var(--accent-9)',
                                                        textDecoration: 'none',
                                                        fontSize: 'var(--font-size-2)',
                                                    }}
                                                >
                                                    View Proof
                                                </a>
                                            </Table.Cell>
                                        </Table.Row>
                                    ))}
                                </Table.Body>
                            </Table.Root>

                            {hasMore && (
                                <Flex justify="center" mt="4">
                                    <Button
                                        variant="outline"
                                        onClick={handleShowMore}
                                        disabled={loading}
                                    >
                                        {loading ? 'Loading...' : 'Show More'}
                                    </Button>
                                </Flex>
                            )}

                            {completions.length === 0 && !loading && (
                                <Flex justify="center" align="center" py="6">
                                    <Text size="3" color="gray">
                                        No completions yet
                                    </Text>
                                </Flex>
                            )}
                        </Flex>
                    </Tabs.Content>

                    <Tabs.Content value="leaderboard">
                        <CompetitionTracking refreshTrigger={refreshTrigger} />
                    </Tabs.Content>

                    <Tabs.Content value="progress">
                        <Flex mt="4" justify="center">
                            <ProgressGraph />
                        </Flex>
                    </Tabs.Content>
                </Tabs.Root>
            </Flex>
        </Card>
    );
}
