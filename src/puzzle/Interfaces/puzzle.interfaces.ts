export interface PuzzleState {
  id: string;
  data: any;
  metadata: {
    moves: number;
    timeSpent: number;
    difficulty: number;
    createdAt: Date;
    lastModified: Date;
  };
}

export interface PuzzleMove {
  id: string;
  type: string;
  data: any;
  timestamp: Date;
  playerId: string;
}

export interface PuzzleHint {
  level: number; // 1-3, increasing specificity
  content: string;
  type: 'directional' | 'elimination' | 'pattern' | 'next-move';
}

export interface PuzzleResult {
  solved: boolean;
  score: number;
  timeBonus: number;
  movesPenalty: number;
  hintsUsed: number;
  totalScore: number;
}

export interface DifficultyMetrics {
  averageSolveTime: number;
  averageMoves: number;
  successRate: number;
  hintsUsageRate: number;
}
