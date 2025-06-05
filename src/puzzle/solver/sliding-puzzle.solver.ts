import {
  PuzzleState,
  PuzzleMove,
  PuzzleHint,
  PuzzleResult,
} from '../interfaces/puzzle.interfaces';
import { AbstractPuzzleSolver } from './abstract-puzzle.solver';

export class SlidingPuzzleSolver extends AbstractPuzzleSolver {
  puzzleType = 'sliding-puzzle';

  generatePuzzle(difficulty: number): PuzzleState {
    const size = Math.min(3 + Math.floor(difficulty / 2), 6); // 3x3 to 6x6
    const target = Array.from(
      { length: size * size - 1 },
      (_, i) => i + 1,
    ).concat([0]);

    // Shuffle ensuring solvability
    const puzzle = [...target];
    for (let i = 0; i < difficulty * 100; i++) {
      const moves = this.getValidMovesForGrid(puzzle, size);
      if (moves.length > 0) {
        const randomMove = moves[Math.floor(Math.random() * moves.length)];
        this.executeGridMove(puzzle, randomMove, size);
      }
    }

    return {
      id: `sliding-${Date.now()}`,
      data: { grid: puzzle, size, target },
      metadata: {
        moves: 0,
        timeSpent: 0,
        difficulty,
        createdAt: new Date(),
        lastModified: new Date(),
      },
    };
  }

  validateMove(state: PuzzleState, move: PuzzleMove): boolean {
    const { grid, size } = state.data;
    const { from, to } = move.data;

    const emptyIndex = grid.indexOf(0);
    const moveIndex = from;

    // Check if move is adjacent to empty space
    const row1 = Math.floor(emptyIndex / size);
    const col1 = emptyIndex % size;
    const row2 = Math.floor(moveIndex / size);
    const col2 = moveIndex % size;

    return Math.abs(row1 - row2) + Math.abs(col1 - col2) === 1;
  }

  executeMove(state: PuzzleState, move: PuzzleMove): PuzzleState {
    const newGrid = [...state.data.grid];
    const { from } = move.data;
    const emptyIndex = newGrid.indexOf(0);

    // Swap tiles
    [newGrid[emptyIndex], newGrid[from]] = [newGrid[from], newGrid[emptyIndex]];

    return {
      ...state,
      data: { ...state.data, grid: newGrid },
      metadata: {
        ...state.metadata,
        moves: state.metadata.moves + 1,
        lastModified: new Date(),
      },
    };
  }

  isSolved(state: PuzzleState): boolean {
    const { grid, target } = state.data;
    return JSON.stringify(grid) === JSON.stringify(target);
  }

  generateHint(state: PuzzleState, level: number): PuzzleHint {
    const { grid, size } = state.data;
    const validMoves = this.getValidMovesForGrid(grid, size);

    switch (level) {
      case 1:
        return {
          level: 1,
          content: `You can move ${validMoves.length} tile(s). Focus on getting numbers in the right positions.`,
          type: 'directional',
        };
      case 2:
        const bestMove = this.findBestMove(state);
        const tileNumber = grid[bestMove];
        return {
          level: 2,
          content: `Try moving tile number ${tileNumber}. It will help position other tiles correctly.`,
          type: 'elimination',
        };
      case 3:
        const nextMove = this.findBestMove(state);
        return {
          level: 3,
          content: `Move the tile at position ${nextMove + 1} next to the empty space.`,
          type: 'next-move',
        };
      default:
        return this.generateHint(state, 1);
    }
  }

  calculateScore(state: PuzzleState, result: PuzzleResult): number {
    const baseScore = 1000;
    const difficultyMultiplier = state.metadata.difficulty * 0.5;
    return Math.round(baseScore * (1 + difficultyMultiplier));
  }

  getValidMoves(state: PuzzleState): PuzzleMove[] {
    const { grid, size } = state.data;
    const moves = this.getValidMovesForGrid(grid, size);

    return moves.map((moveIndex) => ({
      id: `move-${Date.now()}-${moveIndex}`,
      type: 'slide',
      data: { from: moveIndex, to: grid.indexOf(0) },
      timestamp: new Date(),
      playerId: 'current-player', // This would come from context
    }));
  }

  private getValidMovesForGrid(grid: number[], size: number): number[] {
    const emptyIndex = grid.indexOf(0);
    const row = Math.floor(emptyIndex / size);
    const col = emptyIndex % size;
    const moves: number[] = [];

    // Check all four directions
    if (row > 0) moves.push((row - 1) * size + col); // Up
    if (row < size - 1) moves.push((row + 1) * size + col); // Down
    if (col > 0) moves.push(row * size + (col - 1)); // Left
    if (col < size - 1) moves.push(row * size + (col + 1)); // Right

    return moves;
  }

  private executeGridMove(
    grid: number[],
    moveIndex: number,
    size: number,
  ): void {
    const emptyIndex = grid.indexOf(0);
    [grid[emptyIndex], grid[moveIndex]] = [grid[moveIndex], grid[emptyIndex]];
  }

  private findBestMove(state: PuzzleState): number {
    // Simple heuristic: find tile that's closest to its target position
    const { grid, size, target } = state.data;
    const validMoves = this.getValidMovesForGrid(grid, size);

    let bestMove = validMoves[0];
    let bestScore = -1;

    for (const move of validMoves) {
      const tileValue = grid[move];
      const targetIndex = target.indexOf(tileValue);
      const currentRow = Math.floor(move / size);
      const currentCol = move % size;
      const targetRow = Math.floor(targetIndex / size);
      const targetCol = targetIndex % size;

      const distance =
        Math.abs(currentRow - targetRow) + Math.abs(currentCol - targetCol);
      const score = 10 - distance; // Higher score for tiles closer to target

      if (score > bestScore) {
        bestScore = score;
        bestMove = move;
      }
    }

    return bestMove;
  }
}
