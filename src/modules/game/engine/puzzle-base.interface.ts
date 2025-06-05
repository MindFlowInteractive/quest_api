// Abstract interface for all logic puzzles
export interface PuzzleBase<TState, TMove, TSolution> {
  readonly id: string;
  readonly type: string;
  state: TState;

  applyMove(move: TMove): void;
  isSolved(): boolean;
  getSolution(): TSolution;
  validateSolution(solution: TSolution): boolean;
  getAvailableMoves(): TMove[];
  getHint(): string | null;
}
