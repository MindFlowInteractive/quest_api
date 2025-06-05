import { Injectable } from '@nestjs/common';
import { PuzzleBase } from './puzzle-base.interface';
import { PuzzleState } from './puzzle-state.interface';

// Cause-and-effect engine, state management, validation, progression, persistence, analytics
@Injectable()
export class PuzzleEngineService {
  private puzzles: Map<string, PuzzleBase<any, any, any>> = new Map();

  registerPuzzle(puzzle: PuzzleBase<any, any, any>) {
    this.puzzles.set(puzzle.id, puzzle);
  }

  getPuzzle(id: string): PuzzleBase<any, any, any> | undefined {
    return this.puzzles.get(id);
  }

  applyMove(puzzleId: string, move: any): boolean {
    const puzzle = this.puzzles.get(puzzleId);
    if (!puzzle) return false;
    puzzle.applyMove(move);
    return puzzle.isSolved();
  }

  validateSolution(puzzleId: string, solution: any): boolean {
    const puzzle = this.puzzles.get(puzzleId);
    if (!puzzle) return false;
    return puzzle.validateSolution(solution);
  }

  getHint(puzzleId: string): string | null {
    const puzzle = this.puzzles.get(puzzleId);
    if (!puzzle) return null;
    return puzzle.getHint();
  }

  // Add more methods for progression, analytics, persistence, etc.
}
