'use client';

import { useState } from 'react';
import { Box, Button, Card, Flex, Heading, Text, Select, Callout } from '@radix-ui/themes';
import { PlusIcon, ArrowLeftIcon, CheckIcon, ExclamationTriangleIcon } from '@radix-ui/react-icons';
import { TaskSearch } from './task-search';
import { UserCompletionForm } from './user-completion-form';
import { BingoTask } from '../../types/bingo-tile';
import { submitCompletionAction } from '../../actions/server-actions';
import { useAction } from 'next-safe-action/hooks';
import { useRouter } from 'next/navigation';

interface UserCompletion {
    user: string;
    proof: string;
    multiplier: number;
}

type ClanType = 'ironsGrotto' | 'ironDaddy';

interface SubmissionStatus {
    type: 'success' | 'error' | null;
    message: string;
}

export function AdminForm() {
    const [selectedTask, setSelectedTask] = useState<BingoTask | null>(null);
    const [userCompletions, setUserCompletions] = useState<UserCompletion[]>([
        { user: '', proof: '', multiplier: 1 }
    ]);
    const [selectedClan, setSelectedClan] = useState<ClanType>('ironsGrotto');
    const [submissionStatus, setSubmissionStatus] = useState<SubmissionStatus>({ type: null, message: '' });
    
    const router = useRouter();
    const { executeAsync: submitCompletion, isExecuting } = useAction(submitCompletionAction);

    const addUserCompletion = () => {
        setUserCompletions([...userCompletions, { user: '', proof: '', multiplier: 1 }]);
    };

    const updateUserCompletion = (index: number, field: keyof UserCompletion, value: string | number) => {
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

        // Clear previous status
        setSubmissionStatus({ type: null, message: '' });

        // Filter out empty completions and expand multipliers
        const validCompletions = userCompletions.filter(
            completion => completion.user.trim() && completion.proof.trim()
        );

        if (validCompletions.length === 0) {
            setSubmissionStatus({ 
                type: 'error', 
                message: 'Please fill in at least one user completion' 
            });
            return;
        }

        // Expand completions based on multiplier
        const expandedCompletions = validCompletions.flatMap(completion => {
            const entries = [];
            for (let i = 0; i < completion.multiplier; i++) {
                entries.push({
                    user: completion.user,
                    proof: completion.proof
                });
            }
            return entries;
        });

        try {
            const result = await submitCompletion({
                taskId: selectedTask.id,
                clan: selectedClan,
                points: selectedTask.points,
                userCompletions: expandedCompletions,
            });

            if (result?.data) {
                // Success - show total expanded submissions
                const totalSubmissions = expandedCompletions.length;
                const uniqueUsers = new Set(validCompletions.map(c => c.user)).size;
                setSubmissionStatus({ 
                    type: 'success', 
                    message: `Successfully submitted ${totalSubmissions} completion(s) for ${uniqueUsers} user(s) for "${selectedTask.title}"` 
                });
                
                // Reset form on success
                setSelectedTask(null);
                setUserCompletions([{ user: '', proof: '', multiplier: 1 }]);
                setSelectedClan('ironsGrotto');
            } else {
                // Handle action failure
                const errorMessage = result?.serverError ?? 'Failed to submit completions';
                setSubmissionStatus({ 
                    type: 'error', 
                    message: errorMessage 
                });
            }
        } catch (error) {
            console.error('Failed to submit completions:', error);
            setSubmissionStatus({ 
                type: 'error', 
                message: 'An unexpected error occurred while submitting completions' 
            });
        }
    };

    return (
        <Box>
            {/* Back Button */}
            <Flex mb="4">
                <Button 
                    variant="ghost" 
                    onClick={() => router.push('/bingo')}
                    style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}
                >
                    <ArrowLeftIcon />
                    Back to Bingo Board
                </Button>
            </Flex>

            {/* Status Messages */}
            {submissionStatus.type && (
                <Box mb="4">
                    <Callout.Root color={submissionStatus.type === 'success' ? 'green' : 'red'}>
                        <Callout.Icon>
                            {submissionStatus.type === 'success' ? <CheckIcon /> : <ExclamationTriangleIcon />}
                        </Callout.Icon>
                        <Callout.Text>{submissionStatus.message}</Callout.Text>
                    </Callout.Root>
                </Box>
            )}

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
                        <Text size="2" color="gray" mt="2" ml="5">
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
                        Note: Use the multiplier field if a user contributed multiple items. Each completion will be counted the specified number of times.
                    </Text>

                    {/* Show total submissions preview */}
                    {userCompletions.some(c => c.user.trim() && c.proof.trim()) && (
                        <Box mt="3" p="2" style={{ backgroundColor: 'var(--blue-3)', borderRadius: 'var(--radius-2)' }}>
                            <Text size="2" weight="medium" color="blue">
                                Total submissions to be created: {
                                    userCompletions
                                        .filter(c => c.user.trim() && c.proof.trim())
                                        .reduce((sum, c) => sum + c.multiplier, 0)
                                }
                            </Text>
                        </Box>
                    )}
                </Card>
            )}

            {selectedTask && (
                <Flex gap="3" justify="end">
                    <Button variant="outline" onClick={() => {
                        setSelectedTask(null);
                        setUserCompletions([{ user: '', proof: '', multiplier: 1 }]);
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
