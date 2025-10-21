'use client';

import { Box, Container, Heading, Flex, Button } from '@radix-ui/themes';
import { loadCompletionsAction } from './actions/load-completions-action';
import { loadModalCompletionsAction } from './actions/load-modal-completions-action';
import { BingoBoardComponent } from './components/bingo-board';
import { sampleBingoBoard } from './data/sample-bingo-data';
import { applyModalCompletions } from './utils/clan-completions';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { BingoBoard } from './types/bingo-tile';

export default function BingoPage() {
    const [board, setBoard] = useState<BingoBoard | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Function to load/refresh board data
    const refreshBoardData = async () => {
        try {
            // Load both types of completions
            const [scoringCompletions, modalCompletions] = await Promise.all([
                loadCompletionsAction(), // Component + predecessor constraints (for scoring)
                loadModalCompletionsAction() // Component-only (for modal display)
            ]);
            
            const boardWithCompletions = applyModalCompletions(sampleBingoBoard, modalCompletions, scoringCompletions);
            setBoard(boardWithCompletions);
        } catch (error) {
            console.error('Error loading bingo board data:', error);
        } finally {
            setIsLoading(false);
        }
    };

    // Load initial data
    useEffect(() => {
        void refreshBoardData();
    }, []);

    if (isLoading || !board) {
        return (
            <Container size="4" py="6">
                <Box mb="6">
                    <Flex justify="between" align="center" mb="3">
                        <Heading size="8">
                            Iron's Grotto vs Iron Daddys Bingo
                        </Heading>
                        <Link href="/bingo/admin">
                            <Button variant="outline" size="2">
                                Admin Panel
                            </Button>
                        </Link>
                    </Flex>
                </Box>
                <Box py="6">
                    Loading bingo board...
                </Box>
            </Container>
        );
    }

    return (
        <Container size="4" py="6">
            <Box mb="6">
                <Flex justify="between" align="center" mb="3">
                    <Heading size="8">
                        Iron's Grotto vs Iron Daddys Bingo
                    </Heading>
                    <Link href="/bingo/admin">
                        <Button variant="outline" size="2">
                            Admin Panel
                        </Button>
                    </Link>
                </Flex>
            </Box>

            <BingoBoardComponent board={board} onRefresh={refreshBoardData} />
        </Container>
    );
}
