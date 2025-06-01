import { Injectable } from '@nestjs/common';
import { GeneratedPuzzle } from '../interfaces/puzzle.interface';

@Injectable()
export class QualityAssessmentService {
  async assessPuzzle(puzzle: GeneratedPuzzle): Promise<number> {
    const scores = await Promise.all([
      this.assessSolvability(puzzle),
      this.assessEngagement(puzzle),
      this.assessBalance(puzzle),
      this.assessClarity(puzzle),
      this.assessUniqueness(puzzle)
    ]);

    // Weighted average
    const weights = [0.3, 0.25, 0.2, 0.15, 0.1];
    return scores.reduce((sum, score, i) => sum + score * weights[i], 0);
  }

  private async assessSolvability(puzzle: GeneratedPuzzle): Promise<number> {
    // Check if puzzle is solvable using logical steps
    try {
      const solutionPath = await this.findSolutionPath(puzzle);
      if (!solutionPath) return 0;
      
      // Penalize puzzles that require guessing
      const guessSteps = solutionPath.filter(step => step.type === 'guess').length;
      return Math.max(0, 1 - guessSteps * 0.2);
    } catch {
      return 0;
    }
  }

  private async assessEngagement(puzzle: GeneratedPuzzle): Promise<number> {
    // Assess variety of solving techniques required
    const techniques = await this.identifyRequiredTechniques(puzzle);
    const varietyScore = Math.min(1, techniques.length / 5);
    
    // Assess progression of difficulty within puzzle
    const progressionScore = await this.assessDifficultyProgression(puzzle);
    
    return (varietyScore + progressionScore) / 2;
  }

  private async assessBalance(puzzle: GeneratedPuzzle): Promise<number> {
    // Check if puzzle has good balance of easy/hard clues
    const difficultyDistribution = await this.analyzeDifficultyDistribution(puzzle);
    
    // Ideal distribution is roughly normal
    const idealMean = 0.5;
    const actualMean = difficultyDistribution.mean;
    const variance = difficultyDistribution.variance;
    
    const meanScore = 1 - Math.abs(actualMean - idealMean) * 2;
    const varianceScore = Math.min(1, variance * 4); // Prefer some variance
    
    return (meanScore + varianceScore) / 2;
  }

  private async assessClarity(puzzle: GeneratedPuzzle): Promise<number> {
    // Check if clues/rules are clear and unambiguous
    const ambiguityScore = await this.checkForAmbiguity(puzzle);
    const consistencyScore = await this.checkConsistency(puzzle);
    
    return (ambiguityScore + consistencyScore) / 2;
  }

  private async assessUniqueness(puzzle: GeneratedPuzzle): Promise<number> {
    // Already calculated during generation
    return puzzle.metadata.uniquenessScore / 100;
  }

  // Helper methods (simplified implementations)
  private async findSolutionPath(puzzle: GeneratedPuzzle): Promise<any[]> {
    // Return solution steps
    return [];
  }

  private async identifyRequiredTechniques(puzzle: GeneratedPuzzle): Promise<string[]> {
    // Return list of techniques needed
    return ['basic', 'intermediate'];
  }

  private async assessDifficultyProgression(puzzle: GeneratedPuzzle): Promise<number> {
    // Return 0-1 score for how well difficulty progresses
    return 0.8;
  }

  private async analyzeDifficultyDistribution(puzzle: GeneratedPuzzle): Promise<any> {
    // Return statistical distribution of clue difficulties
    return { mean: 0.5, variance: 0.25 };
  }

  private async checkForAmbiguity(puzzle: GeneratedPuzzle): Promise<number> {
    // Return 0-1 score for clarity
    return 0.9;
  }

  private async checkConsistency(puzzle: GeneratedPuzzle): Promise<number> {
    // Return 0-1 score for consistency
    return 0.95;
  }
}
