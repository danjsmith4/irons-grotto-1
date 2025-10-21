'use client';

import { useState, useEffect, useRef } from 'react';
import { Box, Button, Flex, Text, TextField } from '@radix-ui/themes';
import { Cross2Icon } from '@radix-ui/react-icons';
import { useAction } from 'next-safe-action/hooks';
import { loadUsersAction } from '../../actions/load-users-action';

interface UserCompletion {
    user: string;
    proof: string;
    multiplier: number;
}

interface UserCompletionFormProps {
    completion: UserCompletion;
    index: number;
    onUpdate: (field: keyof UserCompletion, value: string | number) => void;
    onRemove: () => void;
    canRemove: boolean;
}

export function UserCompletionForm({
    completion,
    index,
    onUpdate,
    onRemove,
    canRemove
}: UserCompletionFormProps) {
    const [users, setUsers] = useState<string[]>([]);
    const [suggestions, setSuggestions] = useState<string[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const suggestionsRef = useRef<HTMLDivElement>(null);
    
    const { executeAsync: loadUsers, isExecuting: isLoadingUsers } = useAction(loadUsersAction);

    // Load users on component mount
    useEffect(() => {
        const fetchUsers = async () => {
            try {
                const result = await loadUsers({});
                if (result?.data) {
                    setUsers(result.data.users);
                }
            } catch (error) {
                console.error('Failed to load users:', error);
            }
        };

        void fetchUsers();
    }, [loadUsers]);

    // Filter suggestions based on input
    const filterSuggestions = (input: string) => {
        if (!input.trim()) {
            setSuggestions([]);
            setShowSuggestions(false);
            return;
        }

        const filtered = users.filter(user => 
            user.toLowerCase().includes(input.toLowerCase())
        ).slice(0, 5); // Limit to 5 suggestions

        setSuggestions(filtered);
        setShowSuggestions(filtered.length > 0);
    };

    const handleUserInputChange = (value: string) => {
        onUpdate('user', value);
        filterSuggestions(value);
    };

    const handleSuggestionClick = (suggestion: string) => {
        onUpdate('user', suggestion);
        setShowSuggestions(false);
        setSuggestions([]);
    };

    const handleInputBlur = () => {
        // Delay hiding suggestions to allow click events
        setTimeout(() => {
            setShowSuggestions(false);
        }, 200);
    };

    const handleInputFocus = () => {
        if (completion.user && suggestions.length > 0) {
            setShowSuggestions(true);
        }
    };
    return (
        <Box mb="3" p="3" style={{ border: '1px solid var(--gray-6)', borderRadius: 'var(--radius-3)' }}>
            <Flex justify="between" align="center" mb="3">
                <Text weight="medium" size="3">
                    Completion #{index + 1}
                </Text>
                {canRemove && (
                    <Button
                        variant="ghost"
                        color="red"
                        size="1"
                        onClick={onRemove}
                    >
                        <Cross2Icon />
                    </Button>
                )}
            </Flex>

            <Box mb="3" style={{ position: 'relative' }}>
                <Text size="2" weight="medium" mb="2" style={{ display: 'block' }}>
                    User
                </Text>
                <TextField.Root
                    ref={inputRef}
                    placeholder="Enter username"
                    value={completion.user}
                    onChange={(e) => handleUserInputChange(e.target.value)}
                    onFocus={handleInputFocus}
                    onBlur={handleInputBlur}
                    autoComplete="off"
                    data-form-type="other"
                    data-lpignore="true"
                    data-1p-ignore
                />
                
                {/* Autocomplete suggestions */}
                {showSuggestions && (
                    <Box
                        ref={suggestionsRef}
                        style={{
                            position: 'absolute',
                            top: '100%',
                            left: 0,
                            right: 0,
                            backgroundColor: 'var(--color-panel-solid)',
                            border: '1px solid var(--gray-6)',
                            borderRadius: 'var(--radius-3)',
                            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                            zIndex: 1000,
                            maxHeight: '200px',
                            overflowY: 'auto'
                        }}
                    >
                        {suggestions.map((suggestion, idx) => (
                            <Box
                                key={idx}
                                p="2"
                                style={{
                                    cursor: 'pointer',
                                    borderBottom: idx < suggestions.length - 1 ? '1px solid var(--gray-4)' : 'none'
                                }}
                                onMouseDown={(e) => e.preventDefault()} // Prevent blur
                                onClick={() => handleSuggestionClick(suggestion)}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.backgroundColor = 'var(--gray-3)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.backgroundColor = 'transparent';
                                }}
                            >
                                <Text size="2">{suggestion}</Text>
                            </Box>
                        ))}
                    </Box>
                )}
                
                {isLoadingUsers && (
                    <Text size="1" color="gray" mt="1" style={{ display: 'block' }}>
                        Loading existing users...
                    </Text>
                )}
            </Box>

            <Box>
                <Text size="2" weight="medium" mb="2" style={{ display: 'block' }}>
                    Proof URL
                </Text>
                <TextField.Root
                    placeholder="Enter URL to proof (e.g., Discord message, image link)"
                    value={completion.proof}
                    onChange={(e) => onUpdate('proof', e.target.value)}
                />
                <Text size="1" color="gray" mt="1" style={{ display: 'block' }}>
                    Link to external proof (Discord, Imgur, etc.)
                </Text>
            </Box>

            <Box mt="3">
                <Flex justify="between" align="end" mb="2">
                    <Text size="2" weight="medium">
                        Multiplier
                    </Text>
                    {completion.multiplier > 1 && (
                        <Text size="1" color="blue" weight="medium">
                            Will create {completion.multiplier} submissions
                        </Text>
                    )}
                </Flex>
                <TextField.Root
                    type="number"
                    placeholder="1"
                    min="1"
                    max="50"
                    value={completion.multiplier.toString()}
                    onChange={(e) => {
                        const value = parseInt(e.target.value, 10);
                        if (!isNaN(value) && value >= 1 && value <= 50) {
                            onUpdate('multiplier', value);
                        } else if (e.target.value === '') {
                            onUpdate('multiplier', 1);
                        }
                    }}
                    style={{ maxWidth: '100px' }}
                />
                <Text size="1" color="gray" mt="1" style={{ display: 'block' }}>
                    How many items this user contributed (default: 1)
                </Text>
            </Box>
        </Box>
    );
}
