import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { 
  StatisticalAnalysisResult,
  PerformanceMetrics,
  AnomalyScore,
  TrendAnalysis,
  BenchmarkComparison,
  OutlierDetection
} from './interfaces/statistical-analysis.interfaces';
import { PuzzleProgress } from '../../puzzle/entities/puzzle-progress.entity';
import { GameSession } from '../../game-session/entities/game-session.entity';

interface UserStatistics {
  userId: string;
  totalSolutions: number;
  averageTime: number;
  averageScore: number;
  accuracyRate: number;
  improvementRate: number;
  consistencyScore: number;
  skillLevel: number;
  lastUpdated: Date;
}

interface PopulationStatistics {
  totalUsers: number;
  averagePerformance: PerformanceMetrics;
  performanceDistribution: number[];
  skillDistribution: number[];
  timeDistribution: number[];
  accuracyDistribution: number[];
}

@Injectable()
export class StatisticalAnalysisService {
  private readonly logger = new Logger(StatisticalAnalysisService.name);
  
  // Cache for frequently accessed statistics
  private userStatsCache = new Map<string, UserStatistics>();
  private populationStatsCache: PopulationStatistics | null = null;
  private cacheExpiry = 5 * 60 * 1000; // 5 minutes
  
  constructor(
    @InjectRepository(PuzzleProgress)
    private readonly puzzleProgressRepository: Repository<PuzzleProgress>,
    @InjectRepository(GameSession)
    private readonly gameSessionRepository: Repository<GameSession>,
  ) {
    // Initialize population statistics cache
    this.refreshPopulationStatistics();
  }

  async analyzePerformance(
    userId: string,
    puzzleId: string,
    currentPerformance: PerformanceMetrics
  ): Promise<StatisticalAnalysisResult> {
    this.logger.debug(`Analyzing performance for user ${userId}, puzzle ${puzzleId}`);

    try {
      // Get user's historical statistics
      const userStats = await this.getUserStatistics(userId);
      
      // Get population statistics for comparison
      const populationStats = await this.getPopulationStatistics();
      
      // Perform outlier detection
      const outlierDetection = await this.detectOutliers(
        userId,
        currentPerformance,
        userStats,
        populationStats
      );
      
      // Analyze trends and patterns
      const trendAnalysis = await this.analyzeTrends(userId, currentPerformance);
      
      // Compare against benchmarks
      const benchmarkComparison = this.compareToBenchmarks(
        currentPerformance,
        userStats,
        populationStats
      );
      
      // Calculate anomaly scores
      const anomalyScore = this.calculateAnomalyScore(
        currentPerformance,
        userStats,
        outlierDetection,
        trendAnalysis
      );
      
      const result: StatisticalAnalysisResult = {
        userId,
        puzzleId,
        analysisTime: new Date(),
        currentPerformance,
        historicalComparison: {
          userAverage: userStats?.averageScore || 0,
          deviation: this.calculateDeviation(currentPerformance.score, userStats?.averageScore || 0),
          percentileRank: this.calculatePercentileRank(currentPerformance.score, userId),
          significanceLevel: this.calculateSignificanceLevel(currentPerformance, userStats),
        },
        populationComparison: benchmarkComparison,
        outlierDetection,
        trendAnalysis,
        anomalyScore,
        riskAssessment: this.assessRisk(anomalyScore, outlierDetection, trendAnalysis),
        recommendations: this.generateRecommendations(anomalyScore, outlierDetection, trendAnalysis),
      };

      // Update user statistics cache
      await this.updateUserStatistics(userId, currentPerformance);

      return result;

    } catch (error) {
      this.logger.error(`Error in statistical analysis: ${error.message}`, error.stack);
      throw error;
    }
  }

  private async getUserStatistics(userId: string): Promise<UserStatistics | null> {
    // Check cache first
    const cached = this.userStatsCache.get(userId);
    if (cached && (Date.now() - cached.lastUpdated.getTime()) < this.cacheExpiry) {
      return cached;
    }

    // Query database for user's historical data
    const recentProgress = await this.puzzleProgressRepository
      .createQueryBuilder('progress')
      .where('progress.userId = :userId', { userId })
      .andWhere('progress.status = :status', { status: 'completed' })
      .orderBy('progress.completedAt', 'DESC')
      .limit(100) // Last 100 completions
      .getMany();

    if (recentProgress.length === 0) {
      return null;
    }

    // Calculate statistics
    const totalSolutions = recentProgress.length;
    const totalTime = recentProgress.reduce((sum, p) => sum + (p.bestTime || 0), 0);
    const totalScore = recentProgress.reduce((sum, p) => sum + (p.currentScore || 0), 0);
    
    const averageTime = totalTime / totalSolutions;
    const averageScore = totalScore / totalSolutions;
    
    // Calculate accuracy rate (completion rate without hints)
    const accurateCompletions = recentProgress.filter(p => p.hintsUsed === 0).length;
    const accuracyRate = accurateCompletions / totalSolutions;
    
    // Calculate improvement rate
    const improvementRate = this.calculateImprovementRate(recentProgress);
    
    // Calculate consistency score
    const consistencyScore = this.calculateConsistencyScore(recentProgress);
    
    // Estimate skill level
    const skillLevel = this.estimateSkillLevel(averageScore, accuracyRate, averageTime);

    const userStats: UserStatistics = {
      userId,
      totalSolutions,
      averageTime,
      averageScore,
      accuracyRate,
      improvementRate,
      consistencyScore,
      skillLevel,
      lastUpdated: new Date(),
    };

    // Cache the result
    this.userStatsCache.set(userId, userStats);

    return userStats;
  }

  private async getPopulationStatistics(): Promise<PopulationStatistics> {
    // Check cache first
    if (this.populationStatsCache && 
        (Date.now() - this.populationStatsCache.lastUpdated.getTime()) < this.cacheExpiry * 6) {
      return this.populationStatsCache;
    }

    await this.refreshPopulationStatistics();
    return this.populationStatsCache!;
  }

  private async refreshPopulationStatistics(): Promise<void> {
    this.logger.debug('Refreshing population statistics cache');

    try {
      // Get aggregated statistics from database
      const stats = await this.puzzleProgressRepository
        .createQueryBuilder('progress')
        .select([
          'COUNT(DISTINCT progress.userId) as totalUsers',
          'AVG(progress.currentScore) as avgScore',
          'AVG(progress.bestTime) as avgTime',
          'STDDEV(progress.currentScore) as scoreStdDev',
          'STDDEV(progress.bestTime) as timeStdDev',
        ])
        .where('progress.status = :status', { status: 'completed' })
        .andWhere('progress.completedAt > :date', { 
          date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
        })
        .getRawOne();

      // Get distribution data
      const scoreDistribution = await this.getScoreDistribution();
      const timeDistribution = await this.getTimeDistribution();
      const skillDistribution = await this.getSkillDistribution();
      const accuracyDistribution = await this.getAccuracyDistribution();

      this.populationStatsCache = {
        totalUsers: parseInt(stats.totalUsers) || 0,
        averagePerformance: {
          score: parseFloat(stats.avgScore) || 0,
          time: parseFloat(stats.avgTime) || 0,
          accuracy: 0, // Would be calculated separately
          efficiency: 0, // Would be calculated separately
        },
        performanceDistribution: scoreDistribution,
        skillDistribution,
        timeDistribution,
        accuracyDistribution,
        lastUpdated: new Date(),
      } as PopulationStatistics & { lastUpdated: Date };

    } catch (error) {
      this.logger.error(`Error refreshing population statistics: ${error.message}`);
    }
  }

  private async detectOutliers(
    userId: string,
    currentPerformance: PerformanceMetrics,
    userStats: UserStatistics | null,
    populationStats: PopulationStatistics
  ): Promise<OutlierDetection> {
    const outlierDetection: OutlierDetection = {
      isOutlier: false,
      outlierType: [],
      zScores: {
        score: 0,
        time: 0,
        accuracy: 0,
      },
      confidenceLevel: 0,
      comparisonBasis: 'population',
    };

    // Calculate z-scores against population
    const populationZScores = this.calculateZScores(currentPerformance, populationStats.averagePerformance);
    outlierDetection.zScores = populationZScores;

    // Check for outliers (z-score > 2.5 or < -2.5)
    const outlierThreshold = 2.5;
    
    if (Math.abs(populationZScores.score) > outlierThreshold) {
      outlierDetection.isOutlier = true;
      outlierDetection.outlierType.push(populationZScores.score > 0 ? 'high_score' : 'low_score');
    }
    
    if (Math.abs(populationZScores.time) > outlierThreshold) {
      outlierDetection.isOutlier = true;
      outlierDetection.outlierType.push(populationZScores.time > 0 ? 'slow_time' : 'fast_time');
    }
    
    if (Math.abs(populationZScores.accuracy) > outlierThreshold) {
      outlierDetection.isOutlier = true;
      outlierDetection.outlierType.push(populationZScores.accuracy > 0 ? 'high_accuracy' : 'low_accuracy');
    }

    // If user has historical data, also compare against personal history
    if (userStats) {
      const userZScores = this.calculateZScoresAgainstUser(currentPerformance, userStats);
      
      // Use stricter threshold for personal comparison
      const personalThreshold = 3.0;
      
      if (Math.abs(userZScores.score) > personalThreshold) {
        outlierDetection.isOutlier = true;
        outlierDetection.outlierType.push('personal_score_anomaly');
      }
      
      if (Math.abs(userZScores.time) > personalThreshold) {
        outlierDetection.isOutlier = true;
        outlierDetection.outlierType.push('personal_time_anomaly');
      }
      
      outlierDetection.comparisonBasis = 'both';
    }

    // Calculate confidence level
    outlierDetection.confidenceLevel = this.calculateOutlierConfidence(outlierDetection.zScores);

    return outlierDetection;
  }

  private async analyzeTrends(userId: string, currentPerformance: PerformanceMetrics): Promise<TrendAnalysis> {
    // Get recent performance history
    const recentPerformance = await this.getRecentPerformanceHistory(userId, 20);
    
    const trendAnalysis: TrendAnalysis = {
      trendDirection: 'stable',
      trendStrength: 0,
      accelerationRate: 0,
      seasonalPatterns: [],
      volatility: 0,
      predictedNext: null,
    };

    if (recentPerformance.length < 5) {
      return trendAnalysis; // Not enough data for trend analysis
    }

    // Calculate trend using linear regression
    const trend = this.calculateLinearTrend(recentPerformance.map(p => p.score));
    trendAnalysis.trendDirection = trend.slope > 0.1 ? 'improving' : 
                                   trend.slope < -0.1 ? 'declining' : 'stable';
    trendAnalysis.trendStrength = Math.abs(trend.slope);

    // Calculate acceleration (second derivative)
    trendAnalysis.accelerationRate = this.calculateAcceleration(recentPerformance.map(p => p.score));

    // Calculate volatility
    trendAnalysis.volatility = this.calculateVolatility(recentPerformance.map(p => p.score));

    // Detect seasonal patterns (if enough data)
    if (recentPerformance.length >= 14) {
      trendAnalysis.seasonalPatterns = this.detectSeasonalPatterns(recentPerformance);
    }

    // Predict next performance
    if (trend.rSquared > 0.5) { // Only if trend is significant
      trendAnalysis.predictedNext = {
        score: trend.intercept + trend.slope * (recentPerformance.length + 1),
        confidence: trend.rSquared,
        range: [
          trend.intercept + trend.slope * (recentPerformance.length + 1) - (2 * trend.standardError),
          trend.intercept + trend.slope * (recentPerformance.length + 1) + (2 * trend.standardError),
        ],
      };
    }

    return trendAnalysis;
  }

  private compareToBenchmarks(
    currentPerformance: PerformanceMetrics,
    userStats: UserStatistics | null,
    populationStats: PopulationStatistics
  ): BenchmarkComparison {
    return {
      populationPercentile: this.calculatePercentileRank(currentPerformance.score, null, populationStats),
      skillGroupPercentile: this.calculateSkillGroupPercentile(currentPerformance, userStats?.skillLevel || 1),
      timePercentile: this.calculateTimePercentile(currentPerformance.time, populationStats),
      accuracyPercentile: this.calculateAccuracyPercentile(currentPerformance.accuracy, populationStats),
      overallRanking: this.calculateOverallRanking(currentPerformance, populationStats),
    };
  }

  private calculateAnomalyScore(
    currentPerformance: PerformanceMetrics,
    userStats: UserStatistics | null,
    outlierDetection: OutlierDetection,
    trendAnalysis: TrendAnalysis
  ): AnomalyScore {
    let anomalyScore = 0;
    const factors: string[] = [];

    // Factor in outlier detection
    if (outlierDetection.isOutlier) {
      const outlierSeverity = Math.max(...Object.values(outlierDetection.zScores).map(Math.abs));
      anomalyScore += Math.min(outlierSeverity / 5, 0.4); // Cap at 0.4
      factors.push('statistical_outlier');
    }

    // Factor in trend analysis
    if (trendAnalysis.accelerationRate > 2) {
      anomalyScore += 0.3;
      factors.push('rapid_improvement');
    }
    
    if (trendAnalysis.volatility > 1.5) {
      anomalyScore += 0.2;
      factors.push('high_volatility');
    }

    // Factor in consistency
    if (userStats && userStats.consistencyScore < 0.3) {
      anomalyScore += 0.2;
      factors.push('inconsistent_performance');
    }

    // Factor in impossible performance
    if (currentPerformance.score > 1000 && currentPerformance.time < 60) {
      anomalyScore += 0.5;
      factors.push('impossible_performance');
    }

    return {
      score: Math.min(anomalyScore, 1.0), // Cap at 1.0
      severity: anomalyScore > 0.7 ? 'high' : anomalyScore > 0.4 ? 'medium' : 'low',
      factors,
      confidence: outlierDetection.confidenceLevel,
    };
  }

  // Helper methods for statistical calculations
  private calculateDeviation(current: number, historical: number): number {
    if (historical === 0) return 0;
    return (current - historical) / historical;
  }

  private calculatePercentileRank(score: number, userId?: string | null, populationStats?: PopulationStatistics): number {
    // This would use the score distribution to calculate percentile
    // For now, return a placeholder
    return 50; // 50th percentile
  }

  private calculateSignificanceLevel(current: PerformanceMetrics, userStats: UserStatistics | null): number {
    if (!userStats) return 0;
    
    // Calculate t-test significance
    const deviation = Math.abs(current.score - userStats.averageScore);
    const standardError = Math.sqrt(userStats.totalSolutions); // Simplified
    const tValue = deviation / standardError;
    
    // Convert t-value to significance level (simplified)
    return Math.min(tValue / 3, 1.0);
  }

  private calculateZScores(current: PerformanceMetrics, average: PerformanceMetrics): any {
    // This would use actual standard deviations from the population
    // For now, use estimated standard deviations
    return {
      score: (current.score - average.score) / (average.score * 0.3), // Assume 30% std dev
      time: (current.time - average.time) / (average.time * 0.5), // Assume 50% std dev
      accuracy: (current.accuracy - average.accuracy) / 0.2, // Assume 20% std dev
    };
  }

  private calculateZScoresAgainstUser(current: PerformanceMetrics, userStats: UserStatistics): any {
    return {
      score: (current.score - userStats.averageScore) / (userStats.averageScore * 0.2),
      time: (current.time - userStats.averageTime) / (userStats.averageTime * 0.3),
      accuracy: (current.accuracy - userStats.accuracyRate) / 0.15,
    };
  }

  private calculateOutlierConfidence(zScores: any): number {
    const maxZScore = Math.max(...Object.values(zScores).map((z: any) => Math.abs(z)));
    return Math.min(maxZScore / 4, 1.0); // Scale to 0-1
  }

  private async getRecentPerformanceHistory(userId: string, limit: number): Promise<PerformanceMetrics[]> {
    const recentProgress = await this.puzzleProgressRepository
      .createQueryBuilder('progress')
      .where('progress.userId = :userId', { userId })
      .andWhere('progress.status = :status', { status: 'completed' })
      .orderBy('progress.completedAt', 'DESC')
      .limit(limit)
      .getMany();

    return recentProgress.map(p => ({
      score: p.currentScore || 0,
      time: p.bestTime || 0,
      accuracy: p.hintsUsed === 0 ? 1 : 0.5, // Simplified accuracy calculation
      efficiency: (p.currentScore || 0) / (p.bestTime || 1),
    }));
  }

  // Statistical helper methods
  private calculateLinearTrend(values: number[]): any {
    const n = values.length;
    const x = Array.from({length: n}, (_, i) => i);
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = values.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * values[i], 0);
    const sumXX = x.reduce((sum, xi) => sum + xi * xi, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    // Calculate R-squared
    const yMean = sumY / n;
    const ssTotal = values.reduce((sum, yi) => sum + Math.pow(yi - yMean, 2), 0);
    const ssRes = values.reduce((sum, yi, i) => sum + Math.pow(yi - (slope * i + intercept), 2), 0);
    const rSquared = 1 - (ssRes / ssTotal);

    const standardError = Math.sqrt(ssRes / (n - 2));

    return { slope, intercept, rSquared, standardError };
  }

  private calculateAcceleration(values: number[]): number {
    if (values.length < 3) return 0;
    
    // Calculate second derivative approximation
    let acceleration = 0;
    for (let i = 1; i < values.length - 1; i++) {
      acceleration += values[i + 1] - 2 * values[i] + values[i - 1];
    }
    
    return acceleration / (values.length - 2);
  }

  private calculateVolatility(values: number[]): number {
    if (values.length < 2) return 0;
    
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((sum, value) => sum + Math.pow(value - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);
    
    return stdDev / mean; // Coefficient of variation
  }

  private detectSeasonalPatterns(performance: PerformanceMetrics[]): any[] {
    // Simplified seasonal pattern detection
    // In practice, this would use more sophisticated time series analysis
    return [];
  }

  private calculateSkillGroupPercentile(performance: PerformanceMetrics, skillLevel: number): number {
    // This would compare against users of similar skill level
    return 50; // Placeholder
  }

  private calculateTimePercentile(time: number, populationStats: PopulationStatistics): number {
    // This would use the time distribution to calculate percentile
    return 50; // Placeholder
  }

  private calculateAccuracyPercentile(accuracy: number, populationStats: PopulationStatistics): number {
    // This would use the accuracy distribution to calculate percentile
    return 50; // Placeholder
  }

  private calculateOverallRanking(performance: PerformanceMetrics, populationStats: PopulationStatistics): number {
    // This would calculate a composite ranking
    return 50; // Placeholder
  }

  // Distribution calculation methods
  private async getScoreDistribution(): Promise<number[]> {
    // This would calculate score distribution buckets
    return new Array(10).fill(0).map((_, i) => Math.random() * 100);
  }

  private async getTimeDistribution(): Promise<number[]> {
    // This would calculate time distribution buckets
    return new Array(10).fill(0).map((_, i) => Math.random() * 100);
  }

  private async getSkillDistribution(): Promise<number[]> {
    // This would calculate skill level distribution
    return new Array(5).fill(0).map((_, i) => Math.random() * 100);
  }

  private async getAccuracyDistribution(): Promise<number[]> {
    // This would calculate accuracy distribution buckets
    return new Array(10).fill(0).map((_, i) => Math.random() * 100);
  }

  // User statistics calculation helpers
  private calculateImprovementRate(progressData: any[]): number {
    if (progressData.length < 5) return 0;
    
    const recent = progressData.slice(0, 5);
    const older = progressData.slice(-5);
    
    const recentAvg = recent.reduce((sum, p) => sum + (p.currentScore || 0), 0) / recent.length;
    const olderAvg = older.reduce((sum, p) => sum + (p.currentScore || 0), 0) / older.length;
    
    return olderAvg > 0 ? (recentAvg - olderAvg) / olderAvg : 0;
  }

  private calculateConsistencyScore(progressData: any[]): number {
    if (progressData.length < 3) return 1;
    
    const scores = progressData.map(p => p.currentScore || 0);
    const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
    const variance = scores.reduce((sum, score) => sum + Math.pow(score - mean, 2), 0) / scores.length;
    const coefficientOfVariation = Math.sqrt(variance) / mean;
    
    return Math.max(0, 1 - coefficientOfVariation); // Higher score = more consistent
  }

  private estimateSkillLevel(averageScore: number, accuracyRate: number, averageTime: number): number {
    // Simple skill level estimation (1-10 scale)
    let skillLevel = 1;
    
    // Factor in score
    skillLevel += Math.min(averageScore / 100, 4);
    
    // Factor in accuracy
    skillLevel += accuracyRate * 3;
    
    // Factor in speed (lower time = higher skill)
    skillLevel += Math.max(0, 2 - (averageTime / 300));
    
    return Math.min(Math.max(skillLevel, 1), 10);
  }

  private async updateUserStatistics(userId: string, currentPerformance: PerformanceMetrics): Promise<void> {
    // Update the cached user statistics with the new performance data
    const existingStats = this.userStatsCache.get(userId);
    if (existingStats) {
      // Update statistics (simplified - in practice would be more sophisticated)
      existingStats.totalSolutions += 1;
      existingStats.averageScore = (existingStats.averageScore * (existingStats.totalSolutions - 1) + currentPerformance.score) / existingStats.totalSolutions;
      existingStats.lastUpdated = new Date();
      
      this.userStatsCache.set(userId, existingStats);
    }
  }

  private assessRisk(
    anomalyScore: AnomalyScore,
    outlierDetection: OutlierDetection,
    trendAnalysis: TrendAnalysis
  ): any {
    let riskLevel = 'low';
    const riskFactors: string[] = [];
    
    if (anomalyScore.score > 0.7) {
      riskLevel = 'high';
      riskFactors.push('high_anomaly_score');
    } else if (anomalyScore.score > 0.4) {
      riskLevel = 'medium';
    }
    
    if (outlierDetection.isOutlier && outlierDetection.confidenceLevel > 0.8) {
      riskLevel = riskLevel === 'low' ? 'medium' : 'high';
      riskFactors.push('statistical_outlier');
    }
    
    if (trendAnalysis.accelerationRate > 2) {
      riskFactors.push('rapid_skill_improvement');
    }
    
    return {
      level: riskLevel,
      factors: riskFactors,
      score: Math.max(anomalyScore.score, outlierDetection.confidenceLevel),
    };
  }

  private generateRecommendations(
    anomalyScore: AnomalyScore,
    outlierDetection: OutlierDetection,
    trendAnalysis: TrendAnalysis
  ): string[] {
    const recommendations: string[] = [];
    
    if (anomalyScore.score > 0.7) {
      recommendations.push('Immediate manual review recommended');
      recommendations.push('Increase monitoring frequency');
    }
    
    if (outlierDetection.isOutlier) {
      recommendations.push('Compare against known bot patterns');
      recommendations.push('Verify user device and environment');
    }
    
    if (trendAnalysis.accelerationRate > 2) {
      recommendations.push('Review for possible external assistance');
      recommendations.push('Check for sudden strategy changes');
    }
    
    if (trendAnalysis.volatility > 1.5) {
      recommendations.push('Monitor for account sharing');
    }
    
    if (recommendations.length === 0) {
      recommendations.push('Performance appears normal');
    }
    
    return recommendations;
  }
}
