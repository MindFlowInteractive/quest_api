import { PuzzleBase } from './puzzle-base.interface';

// Abstract base class for logic puzzles
export abstract class AbstractPuzzle<TState, TMove, TSolution>
  implements PuzzleBase<TState, TMove, TSolution>
{
  abstract readonly id: string;
  abstract readonly type: string;
  abstract state: TState;

  abstract applyMove(move: TMove): void;
  abstract isSolved(): boolean;
  abstract getSolution(): TSolution;
  abstract validateSolution(solution: TSolution): boolean;
  abstract getAvailableMoves(): TMove[];
  abstract getHint(): string | null;
}
