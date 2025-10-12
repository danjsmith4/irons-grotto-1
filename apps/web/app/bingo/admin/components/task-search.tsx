'use client';

import { useState, useMemo } from 'react';
import { Box, Text, TextField } from '@radix-ui/themes';
import { sampleBingoBoard } from '../../data/sample-bingo-data';
import { BingoTask } from '../../types/bingo-tile';
import { search } from 'fast-fuzzy';

interface TaskSearchProps {
    onTaskSelect: (task: BingoTask) => void;
}

export function TaskSearch({ onTaskSelect }: TaskSearchProps) {
    const [searchQuery, setSearchQuery] = useState('');

    // Flatten all tasks from the bingo board
    const allTasks = useMemo(() => {
        return sampleBingoBoard.tiles.flatMap(tile =>
            tile.tasks.map(task => ({
                ...task,
                tileHeader: tile.header,
                tileImage: tile.image
            }))
        );
    }, []);

    // Perform fuzzy search on task titles, descriptions, and IDs
    const searchResults = useMemo(() => {
        if (!searchQuery.trim()) {
            return allTasks.slice(0, 10); // Show first 10 tasks when no search
        }

        const searchOptions = {
            keySelector: (task: typeof allTasks[0]) => [
                task.title,
                task.description,
                task.id,
                task.tileHeader
            ].join(' ')
        };

        return search(searchQuery, allTasks, searchOptions).slice(0, 10);
    }, [searchQuery, allTasks]);

    const handleTaskSelect = (task: BingoTask) => {
        setSearchQuery(task.title);
        onTaskSelect(task);
    };

    return (
        <Box>
            <TextField.Root
                placeholder="Search for a task by name, description, or ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                mb="3"
            />

            {searchQuery && (
                <Box style={{ maxHeight: '300px', overflowY: 'auto' }}>
                    {searchResults.length > 0 ? (
                        searchResults.map((task) => (
                            <Box
                                key={task.id}
                                p="2"
                                style={{
                                    cursor: 'pointer',
                                    border: '1px solid var(--gray-6)',
                                    borderRadius: 'var(--radius-2)',
                                    marginBottom: 'var(--space-1)'
                                }}
                                onClick={() => handleTaskSelect(task)}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.backgroundColor = 'var(--gray-3)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.backgroundColor = 'transparent';
                                }}
                            >
                                <Text weight="medium" size="3">
                                    {task.title}
                                </Text>
                                <Text color="gray" size="2" style={{ display: 'block', marginTop: 'var(--space-1)' }}>
                                    {task.tileHeader} • {task.points} points
                                </Text>
                                <Text color="gray" size="2" style={{ display: 'block', marginTop: 'var(--space-1)' }}>
                                    {task.description}
                                </Text>
                            </Box>
                        ))
                    ) : (
                        <Text color="gray" size="2">
                            No tasks found matching "{searchQuery}"
                        </Text>
                    )}
                </Box>
            )}
        </Box>
    );
}
