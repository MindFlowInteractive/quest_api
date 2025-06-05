import { Injectable } from '@nestjs/common';
import {
  PuzzleState,
  PuzzleMove,
  PuzzleHint,
  PuzzleResult,
} from './interfaces/puzzle.interfaces';
import { PuzzleEngine } from './solver/puzzle-engine';
import { SlidingPuzzleSolver } from './solver/sliding-puzzle.solver';

@Injectable()
export class PuzzleService {
  private puzzleEngine: PuzzleEngine;

  constructor() {
    this.puzzleEngine = new PuzzleEngine();

    // Register built-in solvers
    this.puzzleEngine.registerSolver(new SlidingPuzzleSolver());
  }

  async createPuzzle(
    type: string,
    difficulty: number,
    playerId?: string,
  ): Promise<PuzzleState> {
    return this.puzzleEngine.generatePuzzle(type, difficulty, playerId);
  }

  async makeMove(
    puzzleId: string,
    move: PuzzleMove,
    currentState: PuzzleState,
  ): Promise<PuzzleState> {
    return this.puzzleEngine.executeMove(puzzleId, move, currentState);
  }

  async getHint(state: PuzzleState, level: number = 1): Promise<PuzzleHint> {
    return this.puzzleEngine.generateHint(state, level);
  }

  async checkSolution(state: PuzzleState): Promise<PuzzleResult> {
    return this.puzzleEngine.checkSolution(state);
  }

  async undo(puzzleId: string): Promise<PuzzleState | null> {
    return this.puzzleEngine.undoMove(puzzleId);
  }

  async redo(puzzleId: string): Promise<PuzzleState | null> {
    return this.puzzleEngine.redoMove(puzzleId);
  }

  async pauseGame(puzzleId: string): Promise<void> {
    this.puzzleEngine.pauseTimer(puzzleId);
  }

  async resumeGame(puzzleId: string): Promise<void> {
    this.puzzleEngine.resumeTimer(puzzleId);
  }

  getEngine(): PuzzleEngine {
    return this.puzzleEngine;
  }
}
