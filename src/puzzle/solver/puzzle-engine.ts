import {
  PuzzleState,
  PuzzleMove,
  PuzzleHint,
  PuzzleResult,
  DifficultyMetrics,
} from '../interfaces/puzzle.interfaces';
import { AbstractPuzzleSolver } from './abstract-puzzle.solver';
import { CauseEffectEngine } from './cause-effect.rule';
import { DynamicDifficultyAdjuster } from './dynamic-difficulty.adjuster';
import { PuzzleHistoryManager } from './puzzle-history.manager';
import { PuzzleTimerScoring } from './puzzle-time.scoring';
import { StateTransitionValidator } from './state-transition.validator';

export class PuzzleEngine {
  private solvers: Map<string, AbstractPuzzleSolver> = new Map();
  private causeEffectEngine = new CauseEffectEngine();
  private stateValidator = new StateTransitionValidator();
  private historyManager = new PuzzleHistoryManager();
  private difficultyAdjuster = new DynamicDifficultyAdjuster();
  private timerScoring = new PuzzleTimerScoring();

  registerSolver(solver: AbstractPuzzleSolver): void {
    this.solvers.set(solver.puzzleType, solver);
  }

  generatePuzzle(
    type: string,
    difficulty: number,
    playerId?: string,
  ): PuzzleState {
    const solver = this.solvers.get(type);
    if (!solver)
      throw new Error(`No solver registered for puzzle type: ${type}`);

    const adjustedDifficulty = playerId
      ? this.difficultyAdjuster.calculateOptimalDifficulty(playerId, difficulty)
      : difficulty;

    const puzzle = solver.generatePuzzle(adjustedDifficulty);
    this.historyManager.addState(puzzle.id, puzzle);
    this.timerScoring.startTimer(puzzle.id);

    return puzzle;
  }

  executeMove(
    puzzleId: string,
    move: PuzzleMove,
    currentState: PuzzleState,
  ): PuzzleState {
    const solver = this.solvers.get(currentState.data.type || 'sliding-puzzle');
    if (!solver) throw new Error('No solver available for this puzzle type');

    // Validate move
    if (!solver.validateMove(currentState, move)) {
      throw new Error('Invalid move');
    }

    // Execute move
    let newState = solver.executeMove(currentState, move);

    // Process cause-and-effect relationships
    newState = this.causeEffectEngine.processEffects(
      solver.puzzleType,
      newState,
    );

    // Validate state transition
    if (
      !this.stateValidator.validateTransition(
        solver.puzzleType,
        currentState,
        newState,
      )
    ) {
      throw new Error('Invalid state transition');
    }

    // Update history
    this.historyManager.addState(puzzleId, newState);

    return newState;
  }

  generateHint(state: PuzzleState, level: number): PuzzleHint {
    const solver = this.solvers.get(state.data.type || 'sliding-puzzle');
    if (!solver) throw new Error('No solver available for this puzzle type');

    return solver.generateHint(state, level);
  }

  checkSolution(state: PuzzleState): PuzzleResult {
    const solver = this.solvers.get(state.data.type || 'sliding-puzzle');
    if (!solver) throw new Error('No solver available for this puzzle type');

    const solved = solver.isSolved(state);
    const elapsedTime = this.timerScoring.getElapsedTime(state.id);
    const baseScore = solver.calculateScore(state, {} as PuzzleResult);

    const timeBonus = this.timerScoring.calculateTimeBonus(elapsedTime, 300000); // 5min target
    const movesPenalty = Math.max(0, (state.metadata.moves - 20) * 10); // Penalty after 20 moves
    const hintsUsed = 0; // This would be tracked separately

    const totalScore = this.timerScoring.calculateScore(
      baseScore,
      timeBonus,
      movesPenalty,
      hintsUsed,
    );

    return {
      solved,
      score: baseScore,
      timeBonus,
      movesPenalty,
      hintsUsed,
      totalScore,
    };
  }

  undoMove(puzzleId: string): PuzzleState | null {
    return this.historyManager.undo(puzzleId);
  }

  redoMove(puzzleId: string): PuzzleState | null {
    return this.historyManager.redo(puzzleId);
  }

  canUndo(puzzleId: string): boolean {
    return this.historyManager.canUndo(puzzleId);
  }

  canRedo(puzzleId: string): boolean {
    return this.historyManager.canRedo(puzzleId);
  }

  pauseTimer(puzzleId: string): void {
    this.timerScoring.pauseTimer(puzzleId);
  }

  resumeTimer(puzzleId: string): void {
    this.timerScoring.resumeTimer(puzzleId);
  }

  updatePlayerMetrics(
    playerId: string,
    metrics: Partial<DifficultyMetrics>,
  ): void {
    this.difficultyAdjuster.updatePlayerMetrics(playerId, metrics);
  }
}
