
// solvers/base-solver.ts
export abstract class PuzzleSolver {
  abstract findAllSolutions(puzzle: any, maxSolutions?: number): Promise<any[]>;
  abstract analyzeDifficulty(puzzle: any): Promise<any>;
}
