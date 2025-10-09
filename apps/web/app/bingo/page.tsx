import { Box, Container, Heading } from '@radix-ui/themes';;
import { checkAccessAction } from './actions/check-access-action';
import { BingoForm } from './components/bingo-form';
import { BingoBoardComponent } from './components/bingo-board';
import { sampleBingoBoard } from './data/sample-bingo-data';

export default async function BingoPage() {
    // Check if user has access
    const accessResult = await checkAccessAction({});
    const hasAccess = accessResult?.data?.hasAccess ?? false;

    return (
        <Container size="4" py="6">
            <Box mb="6">
                <Heading size="8" mb="3">
                    Iron's Grotto vs Iron Daddy Bingo
                </Heading>

            </Box>

            {hasAccess ? (
                <BingoBoardComponent board={sampleBingoBoard} />
            ) : (
                <BingoForm />
            )}
        </Container>
    );
}
