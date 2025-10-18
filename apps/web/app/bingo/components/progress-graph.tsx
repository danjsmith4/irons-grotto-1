'use client';

import { useState, useEffect } from 'react';
import { Card, Text, Flex } from '@radix-ui/themes';
import { useAction } from 'next-safe-action/hooks';
import { loadProgressDataAction } from '../actions/load-progress-data-action';

interface ProgressData {
    team: string;
    data: {
        date: string;
        points: number;
        cumulativePoints: number;
    }[];
}

export function ProgressGraph() {
    const [progressData, setProgressData] = useState<ProgressData[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [hoveredPoint, setHoveredPoint] = useState<{
        team: string;
        date: string;
        points: number;
        x: number;
        y: number;
    } | null>(null);
    
    const { executeAsync: loadProgressData } = useAction(loadProgressDataAction);

    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            try {
                const result = await loadProgressData({});
                if (result?.data?.progressData) {
                    setProgressData(result.data.progressData);
                }
            } catch (error) {
                console.error('Failed to load progress data:', error);
            } finally {
                setIsLoading(false);
            }
        };

        void fetchData();
    }, [loadProgressData]);

    // Generate date range from Oct 20 to Nov 2, 2025
    const generateDateRange = () => {
        const dates = [];
        const start = new Date('2025-10-20');
        const end = new Date('2025-11-02');
        
        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
            dates.push(d.toISOString().split('T')[0]);
        }
        return dates;
    };

    const dateRange = generateDateRange();

    // Prepare data for graphing with all dates filled
    const prepareGraphData = () => {
        const ironsGrottoData = progressData.find(d => d.team === 'ironsGrotto')?.data ?? [];
        const ironDaddyData = progressData.find(d => d.team === 'ironDaddy')?.data ?? [];

        // Create lookup maps
        const ironsGrottoMap = new Map(ironsGrottoData.map(d => [d.date, d.cumulativePoints]));
        const ironDaddyMap = new Map(ironDaddyData.map(d => [d.date, d.cumulativePoints]));

        // Fill in all dates with cumulative points
        let ironsGrottoCumulative = 0;
        let ironDaddyCumulative = 0;

        return dateRange.map(date => {
            // Track if this date has actual data
            const hasIronsGrottoData = ironsGrottoMap.has(date);
            const hasIronDaddyData = ironDaddyMap.has(date);

            // Update cumulative if we have data for this date
            if (hasIronsGrottoData) {
                ironsGrottoCumulative = ironsGrottoMap.get(date)!;
            }
            if (hasIronDaddyData) {
                ironDaddyCumulative = ironDaddyMap.get(date)!;
            }

            return {
                date,
                ironsGrotto: ironsGrottoCumulative,
                ironDaddy: ironDaddyCumulative,
                hasIronsGrottoData,
                hasIronDaddyData
            };
        });
    };

    const graphData = prepareGraphData();
    const maxPoints = Math.max(
        ...graphData.map(d => Math.max(d.ironsGrotto, d.ironDaddy)),
        100 // minimum scale
    );

    if (isLoading) {
        return (
            <Card>
                <Flex direction="column" gap="4" p="4">
                    <Text size="4" weight="bold" align="center">
                        Team Progress Over Time
                    </Text>
                    <Flex justify="center" align="center" py="6">
                        <Text size="3" color="gray">
                            Loading progress data...
                        </Text>
                    </Flex>
                </Flex>
            </Card>
        );
    }

    return (
        <Card>
            <Flex direction="column" gap="4" p="4">
                <Text size="4" weight="bold" align="center">
                    Team Progress Over Time
                </Text>
                
                {/* Simple SVG Line Chart */}
                <Flex justify="center" align="center">
                    <div style={{ width: '100%', maxWidth: '800px', height: '400px', position: 'relative' }}>
                        <svg width="100%" height="100%" viewBox="0 0 800 400" style={{ border: '1px solid var(--gray-6)' }}>
                        {/* Grid lines */}
                        {[0, 0.25, 0.5, 0.75, 1].map(ratio => (
                            <g key={ratio}>
                                <line
                                    x1="60"
                                    y1={350 - ratio * 300}
                                    x2="750"
                                    y2={350 - ratio * 300}
                                    stroke="var(--gray-5)"
                                    strokeWidth="1"
                                    strokeDasharray="2,2"
                                />
                                <text
                                    x="50"
                                    y={355 - ratio * 300}
                                    fontSize="12"
                                    fill="var(--gray-11)"
                                    textAnchor="end"
                                >
                                    {Math.round(maxPoints * ratio)}
                                </text>
                            </g>
                        ))}

                        {/* X-axis labels (every few days) */}
                        {graphData.filter((_, i) => i % 3 === 0).map((d, i) => (
                            <text
                                key={d.date}
                                x={60 + (i * 3 * (690 / (graphData.length - 1)))}
                                y="375"
                                fontSize="10"
                                fill="var(--gray-11)"
                                textAnchor="middle"
                            >
                                {new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </text>
                        ))}

                        {/* Iron's Grotto line */}
                        <polyline
                            points={graphData.map((d, i) => {
                                const x = 60 + (i * (690 / (graphData.length - 1)));
                                const y = 350 - (d.ironsGrotto / maxPoints) * 300;
                                return `${x},${y}`;
                            }).join(' ')}
                            fill="none"
                            stroke="var(--green-9)"
                            strokeWidth="3"
                        />

                        {/* Iron Daddy line */}
                        <polyline
                            points={graphData.map((d, i) => {
                                const x = 60 + (i * (690 / (graphData.length - 1)));
                                const y = 350 - (d.ironDaddy / maxPoints) * 300;
                                return `${x},${y}`;
                            }).join(' ')}
                            fill="none"
                            stroke="var(--amber-9)"
                            strokeWidth="3"
                        />

                        {/* Interactive data points - Iron's Grotto */}
                        {graphData.filter(d => d.hasIronsGrottoData).map((d, i) => {
                            const originalIndex = graphData.indexOf(d);
                            const x = 60 + (originalIndex * (690 / (graphData.length - 1)));
                            const y = 350 - (d.ironsGrotto / maxPoints) * 300;
                            return (
                                <circle
                                    key={`ig-${d.date}`}
                                    cx={x}
                                    cy={y}
                                    r="5"
                                    fill="var(--green-9)"
                                    stroke="white"
                                    strokeWidth="2"
                                    style={{ cursor: 'pointer' }}
                                    onMouseEnter={(e) => {
                                        setHoveredPoint({
                                            team: "Iron's Grotto",
                                            date: d.date,
                                            points: d.ironsGrotto,
                                            x: e.currentTarget.getBoundingClientRect().left,
                                            y: e.currentTarget.getBoundingClientRect().top
                                        });
                                    }}
                                    onMouseLeave={() => setHoveredPoint(null)}
                                />
                            );
                        })}

                        {/* Interactive data points - Iron Daddy */}
                        {graphData.filter(d => d.hasIronDaddyData).map((d, i) => {
                            const originalIndex = graphData.indexOf(d);
                            const x = 60 + (originalIndex * (690 / (graphData.length - 1)));
                            const y = 350 - (d.ironDaddy / maxPoints) * 300;
                            return (
                                <circle
                                    key={`id-${d.date}`}
                                    cx={x}
                                    cy={y}
                                    r="5"
                                    fill="var(--amber-9)"
                                    stroke="white"
                                    strokeWidth="2"
                                    style={{ cursor: 'pointer' }}
                                    onMouseEnter={(e) => {
                                        setHoveredPoint({
                                            team: "Iron Daddy",
                                            date: d.date,
                                            points: d.ironDaddy,
                                            x: e.currentTarget.getBoundingClientRect().left,
                                            y: e.currentTarget.getBoundingClientRect().top
                                        });
                                    }}
                                    onMouseLeave={() => setHoveredPoint(null)}
                                />
                            );
                        })}

                        {/* Legend */}
                        <g>
                            <line x1="600" y1="30" x2="630" y2="30" stroke="var(--green-9)" strokeWidth="3" />
                            <text x="640" y="35" fontSize="14" fill="var(--gray-12)">Iron's Grotto</text>
                            
                            <line x1="600" y1="50" x2="630" y2="50" stroke="var(--amber-9)" strokeWidth="3" />
                            <text x="640" y="55" fontSize="14" fill="var(--gray-12)">Iron Daddy</text>
                        </g>

                        {/* Axis labels */}
                        <text x="400" y="395" fontSize="14" fill="var(--gray-12)" textAnchor="middle">Date</text>
                        <text x="25" y="200" fontSize="14" fill="var(--gray-12)" textAnchor="middle" transform="rotate(-90 25 200)">Points</text>
                        </svg>

                        {/* Hover tooltip */}
                        {hoveredPoint && (
                            <div
                                style={{
                                    position: 'fixed',
                                    left: hoveredPoint.x - 350,
                                    top: hoveredPoint.y - 350,
                                    backgroundColor: 'var(--color-panel-solid)',
                                    border: '1px solid var(--gray-6)',
                                    borderRadius: 'var(--radius-3)',
                                    padding: '8px 12px',
                                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                                    zIndex: 1000,
                                    pointerEvents: 'none',
                                    fontSize: '12px'
                                }}
                            >
                                <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>
                                    {hoveredPoint.team}
                                </div>
                                <div style={{ color: 'var(--gray-11)' }}>
                                    {new Date(hoveredPoint.date).toLocaleDateString('en-US', { 
                                        month: 'short', 
                                        day: 'numeric',
                                        year: 'numeric'
                                    })}
                                </div>
                                <div style={{ fontWeight: 'bold', marginTop: '2px' }}>
                                    {hoveredPoint.points} points
                                </div>
                            </div>
                        )}
                    </div>
                </Flex>
                
                {/* Current standings */}
                <Flex justify="center" gap="6" mt="4">
                    <Flex direction="column" align="center" gap="1">
                        <Text size="2" color="gray" weight="medium">Iron's Grotto</Text>
                        <Text size="4" weight="bold" style={{ color: 'var(--green-9)' }}>
                            {graphData[graphData.length - 1]?.ironsGrotto || 0} pts
                        </Text>
                    </Flex>
                    <Flex direction="column" align="center" gap="1">
                        <Text size="2" color="gray" weight="medium">Iron Daddy</Text>
                        <Text size="4" weight="bold" style={{ color: 'var(--amber-9)' }}>
                            {graphData[graphData.length - 1]?.ironDaddy || 0} pts
                        </Text>
                    </Flex>
                </Flex>
            </Flex>
        </Card>
    );
}