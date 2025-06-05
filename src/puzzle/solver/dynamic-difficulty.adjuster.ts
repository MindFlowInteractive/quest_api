import { DifficultyMetrics } from '../interfaces/puzzle.interfaces';

export class DynamicDifficultyAdjuster {
  private playerMetrics: Map<string, DifficultyMetrics> = new Map();
  private difficultyFactors = {
    timeWeight: 0.3,
    moveWeight: 0.3,
    successWeight: 0.4,
  };

  updatePlayerMetrics(
    playerId: string,
    metrics: Partial<DifficultyMetrics>,
  ): void {
    const current = this.playerMetrics.get(playerId) || {
      averageSolveTime: 0,
      averageMoves: 0,
      successRate: 0,
      hintsUsageRate: 0,
    };

    this.playerMetrics.set(playerId, { ...current, ...metrics });
  }

  calculateOptimalDifficulty(playerId: string, baseDifficulty: number): number {
    const metrics = this.playerMetrics.get(playerId);
    if (!metrics) return baseDifficulty;

    const { timeWeight, moveWeight, successWeight } = this.difficultyFactors;

    // Normalize metrics (assuming baseline values)
    const timeScore = Math.min(metrics.averageSolveTime / 300, 2); // 5min baseline
    const moveScore = Math.min(metrics.averageMoves / 20, 2); // 20 moves baseline
    const successScore = metrics.successRate;

    const performanceScore =
      timeScore * timeWeight +
      moveScore * moveWeight +
      successScore * successWeight;

    // Adjust difficulty based on performance (0.5 to 1.5 multiplier)
    const difficultyMultiplier = Math.max(0.5, Math.min(1.5, performanceScore));

    return Math.round(baseDifficulty * difficultyMultiplier);
  }
}
