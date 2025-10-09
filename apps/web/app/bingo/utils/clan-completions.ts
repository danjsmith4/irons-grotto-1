import { ClanCompletions, BingoBoard, ClanProgress, BingoTile } from '../types/bingo-tile';
import clanCompletionsData from '../data/clan-completions.json';

export function loadClanCompletions(): ClanCompletions {
    return clanCompletionsData as ClanCompletions;
}

export function applyClanCompletions(board: BingoBoard, completions: ClanCompletions): BingoBoard {
    const updatedBoard = { ...board };

    updatedBoard.tiles = board.tiles.map(tile => ({
        ...tile,
        tasks: tile.tasks.map(task => ({
            ...task,
            ironsGrottoCompleted: completions.ironsGrotto.includes(task.id),
            ironDaddyCompleted: completions.ironDaddy.includes(task.id),
        }))
    }));

    return updatedBoard;
}

export function calculateClanProgress(board: BingoBoard, clanName: 'ironsGrotto' | 'ironDaddy'): ClanProgress {
    const totalTasks = board.tiles.reduce((sum, tile) => sum + tile.tasks.length, 0);
    const totalPoints = board.tiles.reduce((sum, tile) =>
        sum + tile.tasks.reduce((taskSum, task) => taskSum + task.points, 0), 0
    );

    let completedTaskCount = 0;
    let earnedPoints = 0;

    // Calculate points based on sequential completion per tile
    board.tiles.forEach(tile => {
        for (const task of tile.tasks) {
            const isCompleted = clanName === 'ironsGrotto'
                ? task.ironsGrottoCompleted
                : task.ironDaddyCompleted;

            if (isCompleted) {
                completedTaskCount++;
                earnedPoints += task.points;
            } else {
                // If this task is not completed, stop processing this tile
                break;
            }
        }
    });

    const progressPercentage = totalTasks > 0 ? Math.round((completedTaskCount / totalTasks) * 100) : 0;

    return {
        clanName: clanName === 'ironsGrotto' ? 'Iron\'s Grotto' : 'Iron Daddy',
        completedTasks: completedTaskCount,
        totalTasks,
        earnedPoints,
        totalPoints,
        progressPercentage,
    };
}

export function calculateTilePoints(tile: BingoTile, clanName: 'ironsGrotto' | 'ironDaddy'): number {
    let earnedPoints = 0;

    // Loop through tasks in order, add points only if previous tasks are completed
    for (const task of tile.tasks) {
        const isCompleted = clanName === 'ironsGrotto'
            ? task.ironsGrottoCompleted
            : task.ironDaddyCompleted;

        if (isCompleted) {
            earnedPoints += task.points;
        } else {
            // If this task is not completed, stop processing
            break;
        }
    }

    return earnedPoints;
}

export function getClanColor(clanName: 'ironsGrotto' | 'ironDaddy'): string {
    return clanName === 'ironsGrotto' ? '#4ade80' : '#f59e0b'; // Green for Iron's Grotto, Amber for Iron Daddy
}
