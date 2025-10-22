'use client';

import { Grid, Text, Card, Flex, Badge, Separator, Button } from '@radix-ui/themes';
import { BingoBoard } from '../types/bingo-tile';
import { BingoTileComponent } from './bingo-tile';
import { CompletionTable } from './completion-table';
import { calculateClanProgress, getClanColor } from '../utils/clan-completions';
import { loadMvpAction } from '../actions/load-mvp-action';
import { useEffect, useState, useRef, useCallback } from 'react';
import { mvp } from '@/lib/db/completions';

interface BingoBoardProps {
    board: BingoBoard;
    onRefresh?: () => Promise<void>;
}

export function BingoBoardComponent({ board, onRefresh }: BingoBoardProps) {
    const gridSize = board.gridSize || Math.ceil(Math.sqrt(board.tiles.length));
    
    // State for MVP data
    const [mvps, setMvps] = useState<{
        ironsGrotto: mvp | null;
        ironDaddy: mvp | null;
    }>({
        ironsGrotto: null,
        ironDaddy: null
    });
    const [isLoadingMvps, setIsLoadingMvps] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [lastActivity, setLastActivity] = useState(Date.now());
    const [isPollingActive, setIsPollingActive] = useState(true);
    const [lastRefreshTime, setLastRefreshTime] = useState<Date | null>(null);
    
    // Refs for managing intervals and activity tracking
    const intervalRef = useRef<NodeJS.Timeout | null>(null);
    const activityTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const lastRefreshRef = useRef<number>(Date.now());

    // Constants for intelligent polling
    const ACTIVE_POLL_INTERVAL = 60000; // 15 seconds when active
    const INACTIVE_POLL_INTERVAL = 2 * 60000; // 1 minute when less active
    const ACTIVITY_TIMEOUT = 2 * 60 * 1000; // 5 minutes of inactivity before slowing down
    const MIN_REFRESH_INTERVAL = 60000; // Minimum 5 seconds between refreshes

    // Manual refresh function
    const handleManualRefresh = useCallback(async () => {
        const now = Date.now();
        if (now - lastRefreshRef.current < MIN_REFRESH_INTERVAL) {
            return; // Prevent too frequent refreshes
        }
        
        setIsRefreshing(true);
        lastRefreshRef.current = now;
        
        try {
            // Refresh MVP data
            const mvpResult = await loadMvpAction();
            if (mvpResult.success) {
                setMvps(mvpResult.mvps);
            }

            // Refresh board data if callback is provided
            if (onRefresh) {
                await onRefresh();
            }
        } catch (error) {
            console.error('Error refreshing bingo board data:', error);
        } finally {
            setIsRefreshing(false);
            setLastRefreshTime(new Date());
        }
    }, [onRefresh]);

    // Activity tracking function
    const trackActivity = useCallback(() => {
        const now = Date.now();
        setLastActivity(now);
        
        // Reset activity timeout
        if (activityTimeoutRef.current) {
            clearTimeout(activityTimeoutRef.current);
        }
        
        // Set new activity timeout
        activityTimeoutRef.current = setTimeout(() => {
            setIsPollingActive(false);
        }, ACTIVITY_TIMEOUT);
        
        // Reactivate polling if it was inactive
        if (!isPollingActive) {
            setIsPollingActive(true);
        }
    }, [isPollingActive]);

    // Set up activity listeners
    useEffect(() => {
        const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
        
        events.forEach(event => {
            document.addEventListener(event, trackActivity, { passive: true });
        });
        
        // Set initial activity timeout
        trackActivity();
        
        return () => {
            events.forEach(event => {
                document.removeEventListener(event, trackActivity);
            });
            if (activityTimeoutRef.current) {
                clearTimeout(activityTimeoutRef.current);
            }
        };
    }, [trackActivity]);

    // Load MVP data on component mount
    useEffect(() => {
        const loadMvps = async () => {
            setIsLoadingMvps(true);
            const result = await loadMvpAction();
            if (result.success) {
                setMvps(result.mvps);
            }
            setIsLoadingMvps(false);
            setLastRefreshTime(new Date());
        };

        void loadMvps();
    }, []);

    // Intelligent polling based on user activity and page visibility
    useEffect(() => {
        const shouldPoll = () => {
            // Don't poll if document is hidden
            if (document.hidden) return false;
            
            // Don't poll if user has been inactive for too long
            const timeSinceActivity = Date.now() - lastActivity;
            if (timeSinceActivity > ACTIVITY_TIMEOUT) return false;
            
            return true;
        };

        const setupPolling = () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }

            if (!shouldPoll()) return;

            // Determine polling interval based on activity
            const timeSinceActivity = Date.now() - lastActivity;
            const interval = timeSinceActivity > ACTIVITY_TIMEOUT / 2 
                ? INACTIVE_POLL_INTERVAL 
                : ACTIVE_POLL_INTERVAL;

            intervalRef.current = setInterval(() => {
                if (shouldPoll()) {
                    void handleManualRefresh();
                } else {
                    // Stop polling if conditions aren't met
                    if (intervalRef.current) {
                        clearInterval(intervalRef.current);
                        intervalRef.current = null;
                    }
                }
            }, interval);
        };

        // Set up initial polling
        setupPolling();

        // Handle visibility change
        const handleVisibilityChange = () => {
            if (document.hidden) {
                // Page is hidden, stop polling
                if (intervalRef.current) {
                    clearInterval(intervalRef.current);
                    intervalRef.current = null;
                }
            } else {
                // Page is visible again, restart polling and refresh data
                trackActivity(); // Mark as active
                void handleManualRefresh();
                setupPolling();
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);

        // Cleanup
        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [lastActivity, handleManualRefresh, trackActivity]);

    // Calculate progress for both clans (board should already have completions applied)
    const ironsGrottoProgress = calculateClanProgress(board, 'ironsGrotto');
    const ironDaddyProgress = calculateClanProgress(board, 'ironDaddy');

    return (
        <Flex direction="column" gap="4">
            {/* Header */}
            <Card>
                <Flex direction="column" gap="4" p="4">
                    {/* Header with refresh button */}
                    <Flex justify="between" align="center">
                        <Flex direction="column" gap="1">
                            <Flex align="center" gap="3">
                                <Text size="4" weight="bold">
                                    Competition Status
                                </Text>
                                {!isPollingActive && (
                                    <Badge variant="soft" color="orange" size="1">
                                        Auto-refresh paused
                                    </Badge>
                                )}
                            </Flex>
                            {lastRefreshTime && (
                                <Text size="1" color="gray">
                                    Last updated: {lastRefreshTime.toLocaleTimeString()}
                                </Text>
                            )}
                        </Flex>
                        <Button
                            variant="outline"
                            size="2"
                            onClick={handleManualRefresh}
                            disabled={isRefreshing}
                        >
                            {isRefreshing ? 'Refreshing...' : 'Refresh'}
                        </Button>
                    </Flex>

                    {/* Clan Progress Overview */}
                    <Flex justify="center" gap="8">
                        <Flex direction="column" align="center" gap="2">
                            <Text size="2" color="gray" weight="medium">Iron's Grotto</Text>
                            <Badge 
                                color="green" 
                                size="3"
                                style={{ 
                                    fontSize: '1rem', 
                                    padding: '8px 12px',
                                    fontWeight: '600'
                                }}
                            >
                                {ironsGrottoProgress.earnedPoints} / {ironsGrottoProgress.totalPoints} pts
                            </Badge>
                            <Text size="3" weight="bold" style={{ color: getClanColor('ironsGrotto') }}>
                                {ironsGrottoProgress.progressPercentage}%
                            </Text>
                        </Flex>

                        <Separator orientation="vertical" />

                        <Flex direction="column" align="center" gap="2">
                            <Text size="2" color="gray" weight="medium">Iron Daddys</Text>
                            <Badge 
                                color="amber" 
                                size="3"
                                style={{ 
                                    fontSize: '1rem', 
                                    padding: '8px 12px',
                                    fontWeight: '600'
                                }}
                            >
                                {ironDaddyProgress.earnedPoints} / {ironDaddyProgress.totalPoints} pts
                            </Badge>
                            <Text size="3" weight="bold" style={{ color: getClanColor('ironDaddy') }}>
                                {ironDaddyProgress.progressPercentage}%
                            </Text>
                        </Flex>
                    </Flex>
                    {/* MVP Stats */}
                    <Separator size="4" />
                    <Flex justify="center" gap="8">
                        <Flex direction="column" align="center" gap="1">
                            <Text size="2" color="gray" weight="medium">Iron's Grotto MVP</Text>
                            {isLoadingMvps ? (
                                <Text size="3" color="gray">Loading...</Text>
                            ) : mvps.ironsGrotto ? (
                                <Flex direction="column" align="center" gap="1">
                                    <Text size="3" weight="bold" style={{ color: getClanColor('ironsGrotto') }}>
                                        {mvps.ironsGrotto.user}
                                    </Text>
                                    <Text size="2" color="gray">
                                        {mvps.ironsGrotto.points} pts • {mvps.ironsGrotto.completions} task{mvps.ironsGrotto.completions === 1 ? '' : 's'} completed
                                    </Text>
                                </Flex>
                            ) : (
                                <Text size="3" color="gray">None</Text>
                            )}
                        </Flex>

                        <Separator orientation="vertical" />

                        <Flex direction="column" align="center" gap="1">
                            <Text size="2" color="gray" weight="medium">Iron Daddys MVP</Text>
                            {isLoadingMvps ? (
                                <Text size="3" color="gray">Loading...</Text>
                            ) : mvps.ironDaddy ? (
                                <Flex direction="column" align="center" gap="1">
                                    <Text size="3" weight="bold" style={{ color: getClanColor('ironDaddy') }}>
                                        {mvps.ironDaddy.user}
                                    </Text>
                                    <Text size="2" color="gray">
                                        {mvps.ironDaddy.points} pts • {mvps.ironDaddy.completions} task{mvps.ironDaddy.completions === 1 ? '' : 's'} completed
                                    </Text>
                                </Flex>
                            ) : (
                                <Text size="3" color="gray">None</Text>
                            )}
                        </Flex>
                    </Flex>
                </Flex>
            </Card>

            {/* Bingo Grid */}
            <Grid
                columns={{
                    initial: '1',
                    sm: '2',
                    md: '3',
                    lg: gridSize.toString(),
                }}
                gap="4"
                width="100%"
            >
                {board.tiles.map((tile) => (
                    <BingoTileComponent key={tile.id} tile={tile} />
                ))}
            </Grid>

            {/* Completion Tracking Table */}
            <CompletionTable board={board} />
        </Flex>
    );
}
