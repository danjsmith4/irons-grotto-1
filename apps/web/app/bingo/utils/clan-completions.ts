import { ClanCompletions, BingoBoard, BingoTask, ClanProgress } from '../types/bingo-tile';
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
    const allTasks = board.tiles.flatMap(tile => tile.tasks);
    const totalTasks = allTasks.length;
    const totalPoints = allTasks.reduce((sum, task) => sum + task.points, 0);

    const completedTasks = allTasks.filter(task => {
        if (clanName === 'ironsGrotto') {
            return task.ironsGrottoCompleted;
        } else {
            return task.ironDaddyCompleted;
        }
    });

    const completedTaskCount = completedTasks.length;
    const earnedPoints = completedTasks.reduce((sum, task) => sum + task.points, 0);
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

export function getClanColor(clanName: 'ironsGrotto' | 'ironDaddy'): string {
    return clanName === 'ironsGrotto' ? '#4ade80' : '#f59e0b'; // Green for Iron's Grotto, Amber for Iron Daddy
}
