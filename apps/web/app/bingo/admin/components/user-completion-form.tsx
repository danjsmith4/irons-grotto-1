'use client';

import { Box, Button, Flex, Text, TextField } from '@radix-ui/themes';
import { Cross2Icon } from '@radix-ui/react-icons';

interface UserCompletion {
    user: string;
    proof: string;
}

interface UserCompletionFormProps {
    completion: UserCompletion;
    index: number;
    onUpdate: (field: keyof UserCompletion, value: string) => void;
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

            <Box mb="3">
                <Text size="2" weight="medium" mb="2" style={{ display: 'block' }}>
                    User
                </Text>
                <TextField.Root
                    placeholder="Enter username"
                    value={completion.user}
                    onChange={(e) => onUpdate('user', e.target.value)}
                />
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
        </Box>
    );
}
