import { Injectable } from '@nestjs/common';
import { DifficultyConstraints, PuzzleType, GeneratedPuzzle } from '../interfaces/puzzle.interface';

@Injectable()
export class DifficultyService {
  async getConstraintsForDifficulty(
    type: PuzzleType,
    difficulty: number
  ): Promise<DifficultyConstraints> {
    const baseConstraints = this.getBaseConstraints(type);
    return this.scaleDifficulty(baseConstraints, difficulty);
  }

  private getBaseConstraints(type: PuzzleType): DifficultyConstraints {
    const constraints: Record<PuzzleType, DifficultyConstraints> = {
      [PuzzleType.SUDOKU]: {
        minComplexity: 1,
        maxComplexity: 10,
        requiredTechniques: ['naked_singles'],
        forbiddenTechniques: [],
        solutionSteps: 20
      },
      [PuzzleType.CROSSWORD]: {
        minComplexity: 1,
        maxComplexity: 8,
        requiredTechniques: ['basic_clues'],
        forbiddenTechniques: [],
        solutionSteps: 15
      },
      [PuzzleType.LOGIC_GRID]: {
        minComplexity: 1,
        maxComplexity: 12,
        requiredTechniques: ['elimination'],
        forbiddenTechniques: [],
        solutionSteps: 25
      },
      [PuzzleType.NUMBER_SEQUENCE]: {
        minComplexity: 1,
        maxComplexity: 6,
        requiredTechniques: ['arithmetic'],
        forbiddenTechniques: [],
        solutionSteps: 10
      },
      [PuzzleType.PATTERN_MATCHING]: {
        minComplexity: 1,
        maxComplexity: 8,
        requiredTechniques: ['visual_matching'],
        forbiddenTechniques: [],
        solutionSteps: 12
      },
      [PuzzleType.WORD_SEARCH]: {
        minComplexity: 1,
        maxComplexity: 5,
        requiredTechniques: ['linear_search'],
        forbiddenTechniques: [],
        solutionSteps: 8
      }
    };

    return constraints[type];
  }

  private scaleDifficulty(
    base: DifficultyConstraints,
    difficulty: number
  ): DifficultyConstraints {
    const scale = Math.max(0.1, Math.min(2.0, difficulty / 5));
    
    return {
      ...base,
      minComplexity: Math.floor(base.minComplexity * scale),
      maxComplexity: Math.floor(base.maxComplexity * scale),
      solutionSteps: Math.floor(base.solutionSteps * scale),
      requiredTechniques: this.scaleTechniques(base.requiredTechniques, difficulty)
    };
  }

  private scaleTechniques(techniques: string[], difficulty: number): string[] {
    const allTechniques = {
      1: ['basic'],
      3: ['basic', 'intermediate'],
      5: ['basic', 'intermediate', 'advanced'],
      7: ['basic', 'intermediate', 'advanced', 'expert'],
      10: ['basic', 'intermediate', 'advanced', 'expert', 'master']
    };

    const level = Math.ceil(difficulty / 2) * 2;
    return allTechniques[Math.min(level, 10)] || techniques;
  }

  async validateDifficulty(puzzle: GeneratedPuzzle): Promise<boolean> {
    const actualDifficulty = await this.analyzePuzzleDifficulty(puzzle);
    const tolerance = 1.0;
    
    return Math.abs(actualDifficulty - puzzle.difficulty) <= tolerance;
  }

  private async analyzePuzzleDifficulty(puzzle: GeneratedPuzzle): Promise<number> {
    // Implement difficulty analysis based on solution complexity
    const solver = this.getSolverForAnalysis(puzzle.type);
    const analysisResult = await solver.analyzeDifficulty(puzzle.puzzle);
    
    return this.convertToStandardScale(analysisResult);
  }

  private getSolverForAnalysis(type: PuzzleType): any {
    // Return appropriate solver for difficulty analysis
    return {}; // Placeholder
  }

  private convertToStandardScale(analysisResult: any): number {
    // Convert solver-specific difficulty to 1-10 scale
    return Math.max(1, Math.min(10, analysisResult.complexity || 5));
  }
}