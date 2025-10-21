'use client';

import { useState, useEffect } from 'react';
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
}

type ClanType = 'ironsGrotto' | 'ironDaddy';

// Cookie key for storing last selected clan
const LAST_CLAN_COOKIE_KEY = 'bingo-admin-last-clan';

// Cookie utility functions
const getClanFromCookie = (): ClanType => {
    if (typeof document === 'undefined') return 'ironsGrotto'; // Default for SSR
    
    try {
        const cookies = document.cookie.split(';');
        const clanCookie = cookies.find(cookie => 
            cookie.trim().startsWith(`${LAST_CLAN_COOKIE_KEY}=`)
        );
        
        if (clanCookie) {
            const value = clanCookie.split('=')[1]?.trim();
            return (value === 'ironDaddy') ? 'ironDaddy' : 'ironsGrotto';
        }
    } catch (error) {
        console.warn('Failed to read clan cookie:', error);
    }
    
    return 'ironsGrotto'; // Default fallback
};

const setClanCookie = (clan: ClanType): void => {
    if (typeof document === 'undefined') return; // Skip for SSR
    
    try {
        // Set cookie to expire in 1 year
        const expiryDate = new Date();
        expiryDate.setFullYear(expiryDate.getFullYear() + 1);
        
        document.cookie = `${LAST_CLAN_COOKIE_KEY}=${clan}; expires=${expiryDate.toUTCString()}; path=/; SameSite=Lax`;
    } catch (error) {
        console.warn('Failed to set clan cookie:', error);
    }
};

interface SubmissionStatus {
    type: 'success' | 'error' | null;
    message: string;
}

export function AdminForm() {
    const [selectedTask, setSelectedTask] = useState<BingoTask | null>(null);
    const [userCompletions, setUserCompletions] = useState<UserCompletion[]>([
        { user: '', proof: '' }
    ]);
    const [selectedClan, setSelectedClan] = useState<ClanType>('ironsGrotto');
    const [submissionStatus, setSubmissionStatus] = useState<SubmissionStatus>({ type: null, message: '' });
    const [clanLoadedFromCookie, setClanLoadedFromCookie] = useState(false);
    
    const router = useRouter();
    const { executeAsync: submitCompletion, isExecuting } = useAction(submitCompletionAction);

    // Initialize clan selection from cookie on component mount
    useEffect(() => {
        const savedClan = getClanFromCookie();
        setSelectedClan(savedClan);
        
        // Check if we actually loaded a saved preference (not the default)
        if (typeof document !== 'undefined') {
            const cookies = document.cookie.split(';');
            const clanCookie = cookies.find(cookie => 
                cookie.trim().startsWith(`${LAST_CLAN_COOKIE_KEY}=`)
            );
            setClanLoadedFromCookie(!!clanCookie);
        }
    }, []);

    // Handle clan selection change and save to cookie
    const handleClanChange = (clan: ClanType) => {
        setSelectedClan(clan);
        setClanCookie(clan);
        setClanLoadedFromCookie(true); // Mark as having a saved preference
    };

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

        // Clear previous status
        setSubmissionStatus({ type: null, message: '' });

        // Filter out empty completions
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

        try {
            const result = await submitCompletion({
                taskId: selectedTask.id,
                clan: selectedClan,
                points: selectedTask.points,
                userCompletions: validCompletions,
            });

            if (result?.data) {
                // Success
                setSubmissionStatus({ 
                    type: 'success', 
                    message: `Successfully submitted ${validCompletions.length} completion(s) for "${selectedTask.title}"` 
                });
                
                // Reset form on success (keep the user's preferred clan)
                setSelectedTask(null);
                setUserCompletions([{ user: '', proof: '' }]);
                // Don't reset selectedClan - keep user's preference
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
                        <Flex justify="between" align="center" mb="2">
                            <Text size="2" weight="medium">
                                Clan
                            </Text>
                            {clanLoadedFromCookie && (
                                <Text size="1" color="blue">
                                    Preference saved
                                </Text>
                            )}
                        </Flex>
                        <Select.Root value={selectedClan} onValueChange={handleClanChange}>
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
                        // Don't reset selectedClan - keep user's preference
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
