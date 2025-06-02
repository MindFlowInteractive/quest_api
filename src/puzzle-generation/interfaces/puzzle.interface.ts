

// interfaces/puzzle.interface.ts
export interface PuzzleConfig {
  type: PuzzleType;
  difficulty: number;
  size?: number;
  constraints?: any;
  theme?: string;
  timeLimit?: number;
}

export enum PuzzleType {
  SUDOKU = 'sudoku',
  CROSSWORD = 'crossword',
  LOGIC_GRID = 'logic_grid',
  NUMBER_SEQUENCE = 'number_sequence',
  PATTERN_MATCHING = 'pattern_matching',
  WORD_SEARCH = 'word_search'
}

export interface GeneratedPuzzle {
  id: string;
  type: PuzzleType;
  difficulty: number;
  puzzle: any;
  solution: any;
  metadata: PuzzleMetadata;
  qualityScore: number;
}

export interface PuzzleMetadata {
  generationTime: number;
  algorithmUsed: string;
  uniquenessScore: number;
  estimatedSolveTime: number;
  hints: string[];
  tags: string[];
}

export interface DifficultyConstraints {
  minComplexity: number;
  maxComplexity: number;
  requiredTechniques: string[];
  forbiddenTechniques: string[];
  solutionSteps: number;
}
