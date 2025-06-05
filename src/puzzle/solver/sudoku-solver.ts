import {
  PuzzleState,
  PuzzleMove,
  PuzzleHint,
  PuzzleResult,
} from '../interfaces/puzzle.interfaces';
import { AbstractPuzzleSolver } from './abstract-puzzle.solver';

export class SudokuSolver extends AbstractPuzzleSolver {
  puzzleType = 'sudoku';

  generatePuzzle(difficulty: number): PuzzleState {
    // Generate a complete 9x9 Sudoku grid
    const completeGrid = this.generateCompleteGrid();

    // Remove numbers based on difficulty (more removed = harder)
    const cellsToRemove = Math.min(20 + difficulty * 5, 60);
    const puzzle = this.removeNumbers(completeGrid, cellsToRemove);

    return {
      id: `sudoku-${Date.now()}`,
      data: {
        grid: puzzle,
        solution: completeGrid,
        size: 9,
        initialGrid: [...puzzle], // Keep original for validation
      },
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
    const { grid, initialGrid, size } = state.data;
    const { row, col, value } = move.data;

    // Check bounds
    if (row < 0 || row >= size || col < 0 || col >= size) return false;

    // Check if cell was initially empty (can't modify pre-filled cells)
    if (initialGrid[row * size + col] !== 0) return false;

    // Check value range
    if (value < 0 || value > size) return false;

    // Check Sudoku rules if placing a number
    if (value > 0) {
      return this.isValidPlacement(grid, row, col, value, size);
    }

    return true; // Removing a number (value = 0) is always valid
  }

  executeMove(state: PuzzleState, move: PuzzleMove): PuzzleState {
    const newGrid = [...state.data.grid];
    const { row, col, value } = move.data;
    const { size } = state.data;

    newGrid[row * size + col] = value;

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
    const { grid, size } = state.data;

    // Check if all cells are filled
    if (grid.includes(0)) return false;

    // Validate all rows, columns, and boxes
    for (let i = 0; i < size; i++) {
      if (
        !this.isValidRow(grid, i, size) ||
        !this.isValidColumn(grid, i, size) ||
        !this.isValidBox(grid, i, size)
      ) {
        return false;
      }
    }

    return true;
  }

  generateHint(state: PuzzleState, level: number): PuzzleHint {
    const { grid, solution, size } = state.data;

    switch (level) {
      case 1: {
        const emptyCells = this.getEmptyCells(grid, size);
        return {
          level: 1,
          content: `You have ${emptyCells.length} empty cells remaining. Focus on rows, columns, or boxes with the most numbers.`,
          type: 'directional',
        };
      }

      case 2:
        {
          const easyCell = this.findEasiestCell(grid, size);
          if (easyCell) {
            const possibleValues = this.getPossibleValues(
              grid,
              easyCell.row,
              easyCell.col,
              size,
            );
            return {
              level: 2,
              content: `Look at row ${easyCell.row + 1}, column ${easyCell.col + 1}. Only ${possibleValues.length} number(s) can go there.`,
              type: 'elimination',
            };
          }
        }
        break;

      case 3:
        {
          const nextMove = this.findBestMove(grid, solution, size);
          if (nextMove) {
            return {
              level: 3,
              content: `Try placing ${nextMove.value} in row ${nextMove.row + 1}, column ${nextMove.col + 1}.`,
              type: 'next-move',
            };
          }
        }
        break;
    }

    return {
      level: 1,
      content: 'Keep working on the puzzle systematically!',
      type: 'directional',
    };
  }

  calculateScore(state: PuzzleState, result: PuzzleResult): number {
    const baseScore = 2000;
    const difficultyMultiplier = state.metadata.difficulty * 0.3;
    return Math.round(baseScore * (1 + difficultyMultiplier));
  }

  getValidMoves(state: PuzzleState): PuzzleMove[] {
    const { grid, size } = state.data;
    const moves: PuzzleMove[] = [];

    for (let row = 0; row < size; row++) {
      for (let col = 0; col < size; col++) {
        if (grid[row * size + col] === 0) {
          const possibleValues = this.getPossibleValues(grid, row, col, size);

          for (const value of possibleValues) {
            moves.push({
              id: `sudoku-${Date.now()}-${row}-${col}-${value}`,
              type: 'place-number',
              data: { row, col, value },
              timestamp: new Date(),
              playerId: 'current-player',
            });
          }
        }
      }
    }

    return moves;
  }

  private generateCompleteGrid(): number[] {
    const grid = new Array(81).fill(0);
    this.fillGrid(grid);
    return grid;
  }

  private fillGrid(grid: number[]): boolean {
    for (let i = 0; i < 81; i++) {
      if (grid[i] === 0) {
        const numbers = this.shuffleArray([1, 2, 3, 4, 5, 6, 7, 8, 9]);

        for (const num of numbers) {
          const row = Math.floor(i / 9);
          const col = i % 9;

          if (this.isValidPlacement(grid, row, col, num, 9)) {
            grid[i] = num;

            if (this.fillGrid(grid)) {
              return true;
            }

            grid[i] = 0;
          }
        }
        return false;
      }
    }
    return true;
  }

  private removeNumbers(grid: number[], count: number): number[] {
    const puzzle = [...grid];
    const positions = Array.from({ length: 81 }, (_, i) => i);
    const shuffled = this.shuffleArray(positions);

    for (let i = 0; i < count && i < shuffled.length; i++) {
      puzzle[shuffled[i]] = 0;
    }

    return puzzle;
  }

  private isValidPlacement(
    grid: number[],
    row: number,
    col: number,
    value: number,
    size: number,
  ): boolean {
    // Check row
    for (let c = 0; c < size; c++) {
      if (c !== col && grid[row * size + c] === value) return false;
    }

    // Check column
    for (let r = 0; r < size; r++) {
      if (r !== row && grid[r * size + col] === value) return false;
    }

    // Check 3x3 box
    const boxRow = Math.floor(row / 3) * 3;
    const boxCol = Math.floor(col / 3) * 3;

    for (let r = boxRow; r < boxRow + 3; r++) {
      for (let c = boxCol; c < boxCol + 3; c++) {
        if ((r !== row || c !== col) && grid[r * size + c] === value)
          return false;
      }
    }

    return true;
  }

  private getPossibleValues(
    grid: number[],
    row: number,
    col: number,
    size: number,
  ): number[] {
    const possible: number[] = [];

    for (let value = 1; value <= size; value++) {
      if (this.isValidPlacement(grid, row, col, value, size)) {
        possible.push(value);
      }
    }

    return possible;
  }

  private getEmptyCells(
    grid: number[],
    size: number,
  ): Array<{ row: number; col: number }> {
    const empty: Array<{ row: number; col: number }> = [];

    for (let i = 0; i < grid.length; i++) {
      if (grid[i] === 0) {
        empty.push({
          row: Math.floor(i / size),
          col: i % size,
        });
      }
    }

    return empty;
  }

  private findEasiestCell(
    grid: number[],
    size: number,
  ): { row: number; col: number } | null {
    let bestCell = null;
    let minPossibilities = size + 1;

    for (let row = 0; row < size; row++) {
      for (let col = 0; col < size; col++) {
        if (grid[row * size + col] === 0) {
          const possibilities = this.getPossibleValues(
            grid,
            row,
            col,
            size,
          ).length;
          if (possibilities < minPossibilities && possibilities > 0) {
            minPossibilities = possibilities;
            bestCell = { row, col };
          }
        }
      }
    }

    return bestCell;
  }

  private findBestMove(
    grid: number[],
    solution: number[],
    size: number,
  ): { row: number; col: number; value: number } | null {
    const easyCell = this.findEasiestCell(grid, size);
    if (easyCell) {
      const value = solution[easyCell.row * size + easyCell.col];
      return { ...easyCell, value };
    }
    return null;
  }

  private isValidRow(grid: number[], row: number, size: number): boolean {
    const seen = new Set<number>();
    for (let col = 0; col < size; col++) {
      const value = grid[row * size + col];
      if (value !== 0 && seen.has(value)) return false;
      seen.add(value);
    }
    return true;
  }

  private isValidColumn(grid: number[], col: number, size: number): boolean {
    const seen = new Set<number>();
    for (let row = 0; row < size; row++) {
      const value = grid[row * size + col];
      if (value !== 0 && seen.has(value)) return false;
      seen.add(value);
    }
    return true;
  }

  private isValidBox(grid: number[], boxIndex: number, size: number): boolean {
    const seen = new Set<number>();
    const boxRow = Math.floor(boxIndex / 3) * 3;
    const boxCol = (boxIndex % 3) * 3;

    for (let r = boxRow; r < boxRow + 3; r++) {
      for (let c = boxCol; c < boxCol + 3; c++) {
        const value = grid[r * size + c];
        if (value !== 0 && seen.has(value)) return false;
        seen.add(value);
      }
    }
    return true;
  }

  private shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }
}
