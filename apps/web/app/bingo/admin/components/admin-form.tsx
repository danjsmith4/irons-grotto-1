'use client';

import { useState } from 'react';
import { Box, Button, Card, Flex, Heading, Text, Select } from '@radix-ui/themes';
import { PlusIcon } from '@radix-ui/react-icons';
import { TaskSearch } from './task-search';
import { UserCompletionForm } from './user-completion-form';
import { BingoTask } from '../../types/bingo-tile';
import { submitCompletionAction } from '../../actions/server-actions';
import { useAction } from 'next-safe-action/hooks';

interface UserCompletion {
    user: string;
    proof: string;
}

type ClanType = 'ironsGrotto' | 'ironDaddy';

export function AdminForm() {
    const [selectedTask, setSelectedTask] = useState<BingoTask | null>(null);
    const [userCompletions, setUserCompletions] = useState<UserCompletion[]>([
        { user: '', proof: '' }
    ]);
    const [selectedClan, setSelectedClan] = useState<ClanType>('ironsGrotto');

    const { execute: submitCompletion, isExecuting } = useAction(submitCompletionAction);

    const addUserCompletion = () => {
        setUserCompletions([...userCompletions, { user: '', proof: '' }]);
    };

    const updateUserCompletion = (index: number, field: keyof UserCompletion, value: string) => {
        const updated = [...userCompletions];
        updated[index] = { ...updated[index], [field]: value };
        setUserCompletions(updated);
    };

    const removeUserCompletion = (index: number) => {
        if (userCompletions.length > 1) {
            const updated = userCompletions.filter((_, i) => i !== index);
            setUserCompletions(updated);
        }
    };

    const handleSubmit = async () => {
        if (!selectedTask) return;

        // Filter out empty completions
        const validCompletions = userCompletions.filter(
            completion => completion.user.trim() && completion.proof.trim()
        );

        if (validCompletions.length === 0) {
            alert('Please fill in at least one user completion');
            return;
        }

        try {
            // eslint-disable-next-line @typescript-eslint/await-thenable
            await submitCompletion({
                taskId: selectedTask.id,
                clan: selectedClan,
                points: selectedTask.points, // Pass the points from the selected task
                userCompletions: validCompletions,
            });

            // Reset form on success
            setSelectedTask(null);
            setUserCompletions([{ user: '', proof: '' }]);
            setSelectedClan('ironsGrotto');
        } catch (error) {
            console.error('Failed to submit completions:', error);
        }
    };

    return (
        <Box>
            <Card size="4" mb="4">
                <Heading size="6" mb="3">
                    Task Selection
                </Heading>
                <TaskSearch onTaskSelect={setSelectedTask} />

                {selectedTask && (
                    <Box mt="4" p="3" style={{ backgroundColor: 'var(--gray-2)', borderRadius: 'var(--radius-3)' }}>
                        <Heading size="5" mb="2">
                            {selectedTask.title}
                        </Heading>
                        <Text color="gray" size="3">
                            {selectedTask.description}
                        </Text>
                        <Text size="2" color="gray" mt="2">
                            Points: {selectedTask.points}
                        </Text>
                    </Box>
                )}
            </Card>

            {selectedTask && (
                <Card size="4" mb="4">
                    <Heading size="6" mb="3">
                        User Completions
                    </Heading>

                    <Box mb="4">
                        <Text size="2" weight="medium" mb="2" style={{ display: 'block' }}>
                            Clan
                        </Text>
                        <Select.Root value={selectedClan} onValueChange={(value) => setSelectedClan(value as ClanType)}>
                            <Select.Trigger />
                            <Select.Content>
                                <Select.Item value="ironsGrotto">Iron's Grotto</Select.Item>
                                <Select.Item value="ironDaddy">Iron Daddy</Select.Item>
                            </Select.Content>
                        </Select.Root>
                    </Box>

                    {userCompletions.map((completion, index) => (
                        <UserCompletionForm
                            key={index}
                            completion={completion}
                            index={index}
                            onUpdate={(field, value) => updateUserCompletion(index, field, value)}
                            onRemove={() => removeUserCompletion(index)}
                            canRemove={userCompletions.length > 1}
                        />
                    ))}

                    <Button
                        variant="outline"
                        onClick={addUserCompletion}
                        style={{ marginTop: 'var(--space-3)' }}
                    >
                        <PlusIcon />
                        Add Another User
                    </Button>

                    <Text size="2" color="gray" mt="3" style={{ display: 'block' }}>
                        Note: If a user contributed more than one item, they should get one proof entry per contribution.
                    </Text>
                </Card>
            )}

            {selectedTask && (
                <Flex gap="3" justify="end">
                    <Button variant="outline" onClick={() => {
                        setSelectedTask(null);
                        setUserCompletions([{ user: '', proof: '' }]);
                        setSelectedClan('ironsGrotto');
                    }}>
                        Cancel
                    </Button>
                    <Button onClick={handleSubmit} disabled={isExecuting}>
                        {isExecuting ? 'Submitting...' : 'Submit Completions'}
                    </Button>
                </Flex>
            )}
        </Box>
    );
}
