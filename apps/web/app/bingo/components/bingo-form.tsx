'use client';

import { useState } from 'react';
import { Card, Flex, Text, Heading, TextField, Button, Separator } from '@radix-ui/themes';
import { validatePasswordAction } from '../actions/validate-password-action';
import { toast } from 'react-toastify';

export function BingoForm() {
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (formData: FormData) => {
        setIsLoading(true);

        try {
            const result = await validatePasswordAction({
                password: formData.get('password') as string,
            });

            if (result?.serverError) {
                toast.error(result.serverError);
            } else if (result?.data?.success) {
                toast.success(result.data.message);
                // Refresh the page to show the bingo content
                window.location.reload();
            }
        } catch {
            toast.error(`An unexpected error occurred. Please try again.}`);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Flex direction="column" gap="6">
            <Card>
                <Flex direction="column" gap="4" p="4">
                    <Heading size="5">Coming Soon</Heading>
                    <Text size="3" color="gray">
                        We're currently working hard to bring you an amazing bingo experience.
                        Stay tuned for updates and get ready to compete with your fellow clan members!
                    </Text>
                </Flex>
            </Card>

            <Card>
                <Flex direction="column" gap="4" p="4">
                    <Heading size="5">Access Bingo</Heading>
                    <Text size="3" color="gray">
                        Enter the password to access the bingo event details and registration.
                    </Text>

                    <Separator size="4" />

                    <form action={handleSubmit}>
                        <Flex gap="3" align="end">
                            <TextField.Root
                                name="password"
                                type="password"
                                placeholder="Enter password"
                                required
                                disabled={isLoading}
                                size="3"
                                style={{ flex: 1 }}
                            />
                            <Button
                                type="submit"
                                disabled={isLoading}
                                size="3"
                            >
                                {isLoading ? 'Checking...' : 'Access'}
                            </Button>
                        </Flex>
                    </form>
                </Flex>
            </Card>
        </Flex>
    );
}
