import { Box, Container, Heading, Flex, Button } from '@radix-ui/themes';
import { loadCompletionsAction } from './actions/load-completions-action';
import { BingoBoardComponent } from './components/bingo-board';
import { sampleBingoBoard } from './data/sample-bingo-data';
import { applyClanCompletions } from './utils/clan-completions';
import Link from 'next/link';

export default async function BingoPage() {

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
                    <Link href="/bingo/admin">
                        <Button variant="outline" size="2">
                            Admin Panel
                        </Button>
                    </Link>
                </Flex>
            </Box>

            <BingoBoardComponent board={boardWithCompletions} />
        </Container>
    );
}
