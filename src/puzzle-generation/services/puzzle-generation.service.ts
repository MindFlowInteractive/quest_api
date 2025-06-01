import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DifficultyService } from './difficulty.service';
import { QualityAssessmentService } from './quality-assessment.service';
import { GenerationAnalyticsService } from './generation-analytics.service';
import { CacheOptimizationService } from './cache-optimization.service';
import { GenerationMetrics } from '../entities/generation-metrics.entity';
import { PuzzleConfig, GeneratedPuzzle, PuzzleType } from '../interfaces/puzzle.interface';

@Injectable()
export class PuzzleGenerationService {
  private readonly logger = new Logger(PuzzleGenerationService.name);

  constructor(
    @InjectRepository(GenerationMetrics)
    private metricsRepository: Repository<GenerationMetrics>,
    private difficultyService: DifficultyService,
    private qualityService: QualityAssessmentService,
    private analyticsService: GenerationAnalyticsService,
    private cacheService: CacheOptimizationService,
  ) {}

  async generatePuzzle(config: PuzzleConfig, userId?: string): Promise<GeneratedPuzzle> {
    const startTime = Date.now();
    
    try {
      // Check cache first
      const cached = await this.cacheService.getCachedPuzzle(config);
      if (cached) {
        this.logger.debug(`Serving cached puzzle for ${config.type}`);
        return cached;
      }

      // Generate new puzzle
      const puzzle = await this.generateNewPuzzle(config);
      
      // Assess quality
      const qualityScore = await this.qualityService.assessPuzzle(puzzle);
      puzzle.qualityScore = qualityScore;

      // Cache if quality is good
      if (qualityScore >= 0.7) {
        await this.cacheService.cachePuzzle(config, puzzle);
      }

      // Record metrics
      await this.recordGenerationMetrics(config, puzzle, Date.now() - startTime);

      return puzzle;
    } catch (error) {
      this.logger.error(`Failed to generate puzzle: ${error.message}`);
      throw error;
    }
  }

  private async generateNewPuzzle(config: PuzzleConfig): Promise<GeneratedPuzzle> {
    const generator = this.getGeneratorForType(config.type);
    const constraints = await this.difficultyService.getConstraintsForDifficulty(
      config.type,
      config.difficulty
    );

    let attempts = 0;
    const maxAttempts = 10;

    while (attempts < maxAttempts) {
      try {
        const puzzle = await generator.generate(config, constraints);
        
        if (await this.validatePuzzle(puzzle)) {
          return puzzle;
        }
        
        attempts++;
      } catch (error) {
        this.logger.warn(`Generation attempt ${attempts + 1} failed: ${error.message}`);
        attempts++;
      }
    }

    throw new Error(`Failed to generate valid puzzle after ${maxAttempts} attempts`);
  }

  private getGeneratorForType(type: PuzzleType): PuzzleGenerator {
    switch (type) {
      case PuzzleType.SUDOKU:
        return new SudokuGenerator();
      case PuzzleType.CROSSWORD:
        return new CrosswordGenerator();
      case PuzzleType.LOGIC_GRID:
        return new LogicGridGenerator();
      case PuzzleType.NUMBER_SEQUENCE:
        return new NumberSequenceGenerator();
      case PuzzleType.PATTERN_MATCHING:
        return new PatternMatchingGenerator();
      case PuzzleType.WORD_SEARCH:
        return new WordSearchGenerator();
      default:
        throw new Error(`Unsupported puzzle type: ${type}`);
    }
  }

  private async validatePuzzle(puzzle: GeneratedPuzzle): Promise<boolean> {
    // Check if puzzle has unique solution
    const hasUniqueSolution = await this.verifyUniqueSolution(puzzle);
    if (!hasUniqueSolution) return false;

    // Check if puzzle meets difficulty requirements
    const meetsRequirements = await this.difficultyService.validateDifficulty(puzzle);
    if (!meetsRequirements) return false;

    // Check for uniqueness against recent puzzles
    const isUnique = await this.checkUniqueness(puzzle);
    if (!isUnique) return false;

    return true;
  }

  private async verifyUniqueSolution(puzzle: GeneratedPuzzle): Promise<boolean> {
    const solver = this.getSolverForType(puzzle.type);
    const solutions = await solver.findAllSolutions(puzzle.puzzle, 2);
    return solutions.length === 1;
  }

  private async checkUniqueness(puzzle: GeneratedPuzzle): Promise<boolean> {
    const recentPuzzles = await this.cacheService.getRecentPuzzles(puzzle.type, 100);
    const similarity = this.calculateMaxSimilarity(puzzle, recentPuzzles);
    return similarity < 0.8; // 80% similarity threshold
  }

  private calculateMaxSimilarity(puzzle: GeneratedPuzzle, others: GeneratedPuzzle[]): number {
    return Math.max(...others.map(other => this.calculateSimilarity(puzzle, other)));
  }

  private calculateSimilarity(puzzle1: GeneratedPuzzle, puzzle2: GeneratedPuzzle): number {
    // Implement similarity calculation based on puzzle structure
    // This is a simplified version
    const str1 = JSON.stringify(puzzle1.puzzle);
    const str2 = JSON.stringify(puzzle2.puzzle);
    
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 1.0;
    
    const editDistance = this.levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }

  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1).fill(null).map(() => 
      Array(str1.length + 1).fill(null)
    );

    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;

    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,
          matrix[j - 1][i] + 1,
          matrix[j - 1][i - 1] + indicator
        );
      }
    }

    return matrix[str2.length][str1.length];
  }

  private getSolverForType(type: PuzzleType): PuzzleSolver {
    switch (type) {
      case PuzzleType.SUDOKU:
        return new SudokuSolver();
      case PuzzleType.CROSSWORD:
        return new CrosswordSolver();
      case PuzzleType.LOGIC_GRID:
        return new LogicGridSolver();
      default:
        throw new Error(`No solver available for type: ${type}`);
    }
  }

  private async recordGenerationMetrics(
    config: PuzzleConfig,
    puzzle: GeneratedPuzzle,
    generationTime: number
  ): Promise<void> {
    const metrics = new GenerationMetrics();
    metrics.puzzleType = config.type;
    metrics.difficulty = config.difficulty;
    metrics.generationTime = generationTime / 1000; // Convert to seconds
    metrics.qualityScore = puzzle.qualityScore;
    metrics.uniquenessScore = puzzle.metadata.uniquenessScore;
    metrics.parameters = config;

    await this.metricsRepository.save(metrics);
  }
}