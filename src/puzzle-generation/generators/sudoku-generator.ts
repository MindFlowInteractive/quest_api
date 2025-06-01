import { PuzzleGenerator } from './base-generator';

export class SudokuGenerator extends PuzzleGenerator {
  async generate(config: PuzzleConfig, constraints: DifficultyConstraints): Promise<GeneratedPuzzle> {
    const startTime = Date.now();
    
    // Generate complete Sudoku grid
    const completeGrid = this.generateCompleteGrid();
    
    // Remove cells based on difficulty
    const puzzle = this.removeCells(completeGrid, config.difficulty);
    
    const generationTime = Date.now() - startTime;
    
    return {
      id: this.generateId(),
      type: PuzzleType.SUDOKU,
      difficulty: config.difficulty,
      puzzle: puzzle,
      solution: completeGrid,
      metadata: this.createMetadata(generationTime, 'backtracking_removal'),
      qualityScore: 0 // Will be set by quality assessment
    };
  }

  private generateCompleteGrid(): number[][] {
    const grid = Array(9).fill(null).map(() => Array(9).fill(0));
    this.fillGrid(grid);
    return grid;
  }

  private fillGrid(grid: number[][]): boolean {
    for (let row = 0; row < 9; row++) {
      for (let col = 0; col < 9; col++) {
        if (grid[row][col] === 0) {
          const numbers = this.shuffleArray([1, 2, 3, 4, 5, 6, 7, 8, 9]);
          
          for (const num of numbers) {
            if (this.isValidPlacement(grid, row, col, num)) {
              grid[row][col] = num;
              
              if (this.fillGrid(grid)) {
                return true;
              }
              
              grid[row][col] = 0;
            }
          }
          
          return false;
        }
      }
    }
    return true;
  }

  private isValidPlacement(grid: number[][], row: number, col: number, num: number): boolean {
    // Check row
    for (let i = 0; i < 9; i++) {
      if (grid[row][i] === num) return false;
    }

    // Check column
    for (let i = 0; i < 9; i++) {
      if (grid[i][col] === num) return false;
    }

    // Check 3x3 box
    const boxRow = Math.floor(row / 3) * 3;
    const boxCol = Math.floor(col / 3) * 3;
    
    for (let i = boxRow; i < boxRow + 3; i++) {
      for (let j = boxCol; j < boxCol + 3; j++) {
        if (grid[i][j] === num) return false;
      }
    }

    return true;
  }

  private removeCells(grid: number[][], difficulty: number): number[][] {
    const puzzle = grid.map(row => [...row]);
    const cellsToRemove = this.calculateCellsToRemove(difficulty);
    
    let removed = 0;
    const attempts = 1000;
    
    for (let i = 0; i < attempts && removed < cellsToRemove; i++) {
      const row = Math.floor(Math.random() * 9);
      const col = Math.floor(Math.random() * 9);
      
      if (puzzle[row][col] !== 0) {
        const backup = puzzle[row][col];
        puzzle[row][col] = 0;
        
        // Check if puzzle still has unique solution
        if (this.hasUniqueSolution(puzzle)) {
          removed++;
        } else {
          puzzle[row][col] = backup;
        }
      }
    }
    
    return puzzle;
  }

  private calculateCellsToRemove(difficulty: number): number {
    // Easy: 40-45, Medium: 46-50, Hard: 51-55, Expert: 56-60
    const baseRemoval = 35 + (difficulty * 2.5);
    return Math.floor(baseRemoval + Math.random() * 5);
  }

  private hasUniqueSolution(puzzle: number[][]): boolean {
    const solutions = [];
    this.solvePuzzle(puzzle.map(row => [...row]), solutions, 2);
    return solutions.length === 1;
  }

  private solvePuzzle(grid: number[][], solutions: number[][][], maxSolutions: number): void {
    if (solutions.length >= maxSolutions) return;
    
    const emptyCell = this.findEmptyCell(grid);
    if (!emptyCell) {
      solutions.push(grid.map(row => [...row]));
      return;
    }
    
    const [row, col] = emptyCell;
    
    for (let num = 1; num <= 9; num++) {
      if (this.isValidPlacement(grid, row, col, num)) {
        grid[row][col] = num;
        this.solvePuzzle(grid, solutions, maxSolutions);
        grid[row][col] = 0;
      }
    }
  }

  private findEmptyCell(grid: number[][]): [number, number] | null {
    for (let row = 0; row < 9; row++) {
      for (let col = 0; col < 9; col++) {
        if (grid[row][col] === 0) {
          return [row, col];
        }
      }
    }
    return null;
  }

  private shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  protected estimateSolveTime(): number {
    return Math.floor(300 + Math.random() * 600); // 5-15 minutes
  }

  protected generateHints(): string[] {
    return [
      "Look for cells with only one possible number",
      "Check rows, columns, and boxes systematically",
      "Use elimination to narrow down possibilities"
    ];
  }

  protected generateTags(): string[] {
    return ["logic", "numbers", "grid", "elimination"];
  }
}