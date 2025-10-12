import { Box, Container, Heading, Flex, Button } from '@radix-ui/themes';;
import { checkAccessAction } from './actions/check-access-action';
import { loadCompletionsAction } from './actions/load-completions-action';
import { BingoForm } from './components/bingo-form';
import { BingoBoardComponent } from './components/bingo-board';
import { sampleBingoBoard } from './data/sample-bingo-data';
import { applyClanCompletions } from './utils/clan-completions';
import Link from 'next/link';

export default async function BingoPage() {
    // Check if user has access
    const accessResult = await checkAccessAction({});
    const hasAccess = accessResult?.data?.hasAccess ?? false;

    // Load completions from database using server action
    const completions = await loadCompletionsAction();
    const boardWithCompletions = applyClanCompletions(sampleBingoBoard, completions);

    return (
        <Container size="4" py="6">
            <Box mb="6">
                <Flex justify="between" align="center" mb="3">
                    <Heading size="8">
                        Iron's Grotto vs Iron Daddy Bingo
                    </Heading>
                    {hasAccess && (
                        <Link href="/bingo/admin">
                            <Button variant="outline" size="2">
                                Admin Panel
                            </Button>
                        </Link>
                    )}
                </Flex>
            </Box>

            {hasAccess ? (
                <BingoBoardComponent board={boardWithCompletions} />
            ) : (
                <BingoForm />
            )}
        </Container>
    );
}
