export interface BingoTask {
    id: string;
    title: string;
    description: string;
    points: number;
    completed?: boolean;
    ironsGrottoCompleted?: boolean;
    ironDaddyCompleted?: boolean;
    components?: number; // Optional: number of required components for multi-part tasks
}

export interface BingoTile {
    id: string;
    header: string;
    image: string; // Single wiki name for image
    tasks: BingoTask[]; // 3 tiers of tasks
    completed?: boolean;
    description?: string;
}

export interface BingoBoard {
    id: string;
    title: string;
    tiles: BingoTile[];
    gridSize: number; // Will be calculated from tiles.length
}

export interface ClanCompletions {
    ironsGrotto: string[];
    ironDaddy: string[];
}

export interface ClanProgress {
    clanName: string;
    completedTasks: number;
    totalTasks: number;
    earnedPoints: number;
    totalPoints: number;
    progressPercentage: number;
}
