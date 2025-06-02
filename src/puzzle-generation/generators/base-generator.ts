export abstract class PuzzleGenerator {
  abstract generate(config: PuzzleConfig, constraints: DifficultyConstraints): Promise<GeneratedPuzzle>;
  
  protected generateId(): string {
    return `puzzle_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  protected createMetadata(
    generationTime: number,
    algorithmUsed: string,
    uniquenessScore: number = 85
  ): PuzzleMetadata {
    return {
      generationTime,
      algorithmUsed,
      uniquenessScore,
      estimatedSolveTime: this.estimateSolveTime(),
      hints: this.generateHints(),
      tags: this.generateTags()
    };
  }

  protected abstract estimateSolveTime(): number;
  protected abstract generateHints(): string[];
  protected abstract generateTags(): string[];
}