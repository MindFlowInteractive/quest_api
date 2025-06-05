import {
  PuzzleHint,
  PuzzleMove,
  PuzzleResult,
  PuzzleState,
} from '../interfaces/puzzle.interfaces';

export abstract class AbstractPuzzleSolver {
  abstract puzzleType: string;

  abstract generatePuzzle(difficulty: number): PuzzleState;
  abstract validateMove(state: PuzzleState, move: PuzzleMove): boolean;
  abstract executeMove(state: PuzzleState, move: PuzzleMove): PuzzleState;
  abstract isSolved(state: PuzzleState): boolean;
  abstract generateHint(state: PuzzleState, level: number): PuzzleHint;
  abstract calculateScore(state: PuzzleState, result: PuzzleResult): number;
  abstract getValidMoves(state: PuzzleState): PuzzleMove[];
}
