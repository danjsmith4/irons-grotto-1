import { Box, Container, Heading, Text, Button } from '@radix-ui/themes';
import { auth } from '@/auth';
import { ADMIN_DISCORD_USER_IDS } from '@/config/admin-users';
import { signInForAdmin } from '../actions/admin-auth-action';
import { AdminForm } from './components/admin-form';

export default async function AdminPage() {
    const session = await auth();

    // If not logged in, show login prompt
    if (!session?.user?.id) {
        const handleLogin = async () => {
            'use server';
            await signInForAdmin();
        };

        return (
            <Container size="4" py="6">
                <Box mb="6">
                    <Heading size="8" mb="3">
                        Bingo Admin
                    </Heading>
                    <Text color="gray" mb="4">
                        You need to log in with Discord to access the admin panel.
                    </Text>
                    <form action={handleLogin}>
                        <Button type="submit" size="3">
                            Login with Discord
                        </Button>
                    </form>
                </Box>
            </Container>
        );
    }

    // Check if user has admin access
    const hasAdminAccess = ADMIN_DISCORD_USER_IDS.includes(session.user.id);

    if (!hasAdminAccess) {
        return (
            <Container size="4" py="6">
                <Box mb="6">
                    <Heading size="8" mb="3">
                        Bingo Admin
                    </Heading>
                    <Text color="red">
                        You do not have admin access to this page.
                    </Text>
                    <Text color="gray" size="2" mt="2">
                        Logged in as Discord user: {session.user.id}
                    </Text>
                </Box>
            </Container>
        );
    }

    return (
        <Container size="4" py="6">
            <Box mb="6">
                <Heading size="8" mb="3">
                    Bingo Admin
                </Heading>
                <Text color="gray">
                    Manage clan progress and task completions
                </Text>
            </Box>

            <AdminForm />
        </Container>
    );
}
