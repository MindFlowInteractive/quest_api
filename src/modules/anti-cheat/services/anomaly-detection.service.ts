import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { 
  CheatDetectionResult, 
  AntiCheatFlags, 
  CheatSeverity, 
  AutoActionType,
  AnomalyDetection,
  StatisticalAnomaly,
  TemporalAnomaly,
  BehavioralAnomaly,
  CheatDetectionConfig
} from '../interfaces/anti-cheat.interfaces';
import { CheatDetectionLog } from '../entities/cheat-detection-log.entity';
import { UserBehaviorProfile } from '../entities/user-behavior-profile.entity';
import { PuzzleProgress } from '../../../puzzle/entities/puzzle-progress.entity';
import { GameSession } from '../../../game-session/entities/game-session.entity';

@Injectable()
export class AnomalyDetectionService {
  private readonly logger = new Logger(AnomalyDetectionService.name);
  
  // Statistical thresholds for anomaly detection
  private readonly STATISTICAL_THRESHOLDS = {
    Z_SCORE_THRESHOLD: 3.0, // 3 standard deviations
    PERCENTILE_THRESHOLD: 0.99, // Top 1% threshold
    MINIMUM_SAMPLE_SIZE: 10,
    ROLLING_WINDOW_SIZE: 20,
  };

  constructor(
    @InjectRepository(CheatDetectionLog)
    private readonly cheatDetectionRepository: Repository<CheatDetectionLog>,
    @InjectRepository(UserBehaviorProfile)
    private readonly behaviorProfileRepository: Repository<UserBehaviorProfile>,
    @InjectRepository(PuzzleProgress)
    private readonly puzzleProgressRepository: Repository<PuzzleProgress>,
    @InjectRepository(GameSession)
    private readonly gameSessionRepository: Repository<GameSession>,
  ) {}

  async detectAnomalies(
    userId: string,
    sessionData: any,
    config: CheatDetectionConfig
  ): Promise<AnomalyDetection> {
    this.logger.debug(`Detecting anomalies for user ${userId}`);

    const detection: AnomalyDetection = {
      statisticalAnomalies: [],
      temporalAnomalies: [],
      behavioralAnomalies: [],
      aggregateRiskScore: 0,
    };

    try {
      // Get user's historical data for comparison
      const historicalData = await this.getUserHistoricalData(userId);
      const userProfile = await this.getUserBehaviorProfile(userId);

      // 1. Statistical Anomaly Detection
      if (config.enableStatisticalAnalysis) {
        detection.statisticalAnomalies = await this.detectStatisticalAnomalies(
          sessionData,
          historicalData,
          userProfile
        );
      }

      // 2. Temporal Anomaly Detection
      if (config.enableRealTimeDetection) {
        detection.temporalAnomalies = await this.detectTemporalAnomalies(
          sessionData,
          config.timingThresholds
        );
      }

      // 3. Behavioral Anomaly Detection
      if (config.enableBehavioralAnalysis) {
        detection.behavioralAnomalies = await this.detectBehavioralAnomalies(
          sessionData,
          userProfile,
          config.behaviorThresholds
        );
      }

      // 4. Calculate aggregate risk score
      detection.aggregateRiskScore = this.calculateAggregateRiskScore(detection);

      this.logger.log(
        `Anomaly detection complete for ${userId}: ` +
        `Statistical=${detection.statisticalAnomalies.length}, ` +
        `Temporal=${detection.temporalAnomalies.length}, ` +
        `Behavioral=${detection.behavioralAnomalies.length}, ` +
        `Risk=${detection.aggregateRiskScore.toFixed(3)}`
      );

      return detection;

    } catch (error) {
      this.logger.error(`Error in anomaly detection: ${error.message}`, error.stack);
      return detection;
    }
  }

  private async detectStatisticalAnomalies(
    sessionData: any,
    historicalData: any[],
    userProfile: UserBehaviorProfile | null
  ): Promise<StatisticalAnomaly[]> {
    const anomalies: StatisticalAnomaly[] = [];

    if (historicalData.length < this.STATISTICAL_THRESHOLDS.MINIMUM_SAMPLE_SIZE) {
      return anomalies; // Not enough data for statistical analysis
    }

    // Timing anomalies
    const timingAnomalies = this.detectTimingStatisticalAnomalies(sessionData, historicalData);
    anomalies.push(...timingAnomalies);

    // Accuracy anomalies
    const accuracyAnomalies = this.detectAccuracyStatisticalAnomalies(sessionData, historicalData);
    anomalies.push(...accuracyAnomalies);

    // Efficiency anomalies
    const efficiencyAnomalies = this.detectEfficiencyStatisticalAnomalies(sessionData, historicalData);
    anomalies.push(...efficiencyAnomalies);

    // Consistency anomalies
    if (userProfile) {
      const consistencyAnomalies = this.detectConsistencyStatisticalAnomalies(sessionData, userProfile);
      anomalies.push(...consistencyAnomalies);
    }

    return anomalies;
  }

  private detectTimingStatisticalAnomalies(
    sessionData: any,
    historicalData: any[]
  ): StatisticalAnomaly[] {
    const anomalies: StatisticalAnomaly[] = [];

    // Calculate historical timing statistics
    const historicalTimes = historicalData
      .map(session => session.averageTime || session.duration)
      .filter(time => time > 0);

    if (historicalTimes.length === 0) return anomalies;

    const mean = historicalTimes.reduce((sum, time) => sum + time, 0) / historicalTimes.length;
    const variance = historicalTimes.reduce(
      (sum, time) => sum + Math.pow(time - mean, 2), 0
    ) / historicalTimes.length;
    const stdDev = Math.sqrt(variance);

    // Current session timing
    const currentTiming = sessionData.timingData?.reduce((sum: number, time: number) => sum + time, 0) / 
                         (sessionData.timingData?.length || 1);

    if (currentTiming && stdDev > 0) {
      const zScore = Math.abs(currentTiming - mean) / stdDev;

      if (zScore > this.STATISTICAL_THRESHOLDS.Z_SCORE_THRESHOLD) {
        anomalies.push({
          type: 'timing',
          severity: Math.min(1.0, zScore / 5.0), // Normalize to 0-1
          description: `Timing significantly deviates from historical pattern (z-score: ${zScore.toFixed(2)})`,
          expectedRange: [mean - 2 * stdDev, mean + 2 * stdDev],
          actualValue: currentTiming,
          zScore,
        });
      }
    }

    return anomalies;
  }

  private detectAccuracyStatisticalAnomalies(
    sessionData: any,
    historicalData: any[]
  ): StatisticalAnomaly[] {
    const anomalies: StatisticalAnomaly[] = [];

    // Calculate historical accuracy
    const historicalAccuracy = historicalData
      .map(session => session.accuracy || (session.currentScore / session.maxScore))
      .filter(acc => acc >= 0 && acc <= 1);

    if (historicalAccuracy.length === 0) return anomalies;

    const mean = historicalAccuracy.reduce((sum, acc) => sum + acc, 0) / historicalAccuracy.length;
    const variance = historicalAccuracy.reduce(
      (sum, acc) => sum + Math.pow(acc - mean, 2), 0
    ) / historicalAccuracy.length;
    const stdDev = Math.sqrt(variance);

    // Current session accuracy
    const currentAccuracy = sessionData.accuracy || 
                           (sessionData.finalState?.score / sessionData.maxPossibleScore);

    if (currentAccuracy !== undefined && stdDev > 0) {
      const zScore = Math.abs(currentAccuracy - mean) / stdDev;

      if (zScore > this.STATISTICAL_THRESHOLDS.Z_SCORE_THRESHOLD) {
        anomalies.push({
          type: 'accuracy',
          severity: Math.min(1.0, zScore / 5.0),
          description: `Accuracy significantly deviates from historical pattern (z-score: ${zScore.toFixed(2)})`,
          expectedRange: [Math.max(0, mean - 2 * stdDev), Math.min(1, mean + 2 * stdDev)],
          actualValue: currentAccuracy,
          zScore,
        });
      }
    }

    return anomalies;
  }

  private detectEfficiencyStatisticalAnomalies(
    sessionData: any,
    historicalData: any[]
  ): StatisticalAnomaly[] {
    const anomalies: StatisticalAnomaly[] = [];

    // Calculate efficiency as moves per point scored
    const historicalEfficiency = historicalData
      .map(session => session.moveCount / Math.max(1, session.currentScore))
      .filter(eff => eff > 0 && eff < 100); // Filter outliers

    if (historicalEfficiency.length === 0) return anomalies;

    const mean = historicalEfficiency.reduce((sum, eff) => sum + eff, 0) / historicalEfficiency.length;
    const variance = historicalEfficiency.reduce(
      (sum, eff) => sum + Math.pow(eff - mean, 2), 0
    ) / historicalEfficiency.length;
    const stdDev = Math.sqrt(variance);

    // Current session efficiency
    const currentEfficiency = sessionData.moveSequence?.length / 
                             Math.max(1, sessionData.finalState?.score || 0);

    if (currentEfficiency && stdDev > 0) {
      const zScore = Math.abs(currentEfficiency - mean) / stdDev;

      if (zScore > this.STATISTICAL_THRESHOLDS.Z_SCORE_THRESHOLD) {
        anomalies.push({
          type: 'efficiency',
          severity: Math.min(1.0, zScore / 5.0),
          description: `Efficiency significantly deviates from historical pattern (z-score: ${zScore.toFixed(2)})`,
          expectedRange: [Math.max(0, mean - 2 * stdDev), mean + 2 * stdDev],
          actualValue: currentEfficiency,
          zScore,
        });
      }
    }

    return anomalies;
  }

  private detectConsistencyStatisticalAnomalies(
    sessionData: any,
    userProfile: UserBehaviorProfile
  ): StatisticalAnomaly[] {
    const anomalies: StatisticalAnomaly[] = [];

    // Check consistency with user's typical behavior profile
    const expectedConsistency = userProfile.consistencyScore;
    const currentConsistency = this.calculateSessionConsistency(sessionData);

    const deviation = Math.abs(currentConsistency - expectedConsistency);
    
    if (deviation > 0.3) { // More than 30% deviation
      anomalies.push({
        type: 'consistency',
        severity: Math.min(1.0, deviation / 0.5), // Normalize to 0-1
        description: `Consistency significantly differs from user profile`,
        expectedRange: [expectedConsistency - 0.2, expectedConsistency + 0.2],
        actualValue: currentConsistency,
        zScore: deviation / 0.1, // Rough z-score approximation
      });
    }

    return anomalies;
  }

  private async detectTemporalAnomalies(
    sessionData: any,
    timingThresholds: any
  ): Promise<TemporalAnomaly[]> {
    const anomalies: TemporalAnomaly[] = [];

    if (!sessionData.timingData || sessionData.timingData.length === 0) {
      return anomalies;
    }

    const timingData = sessionData.timingData;

    // Detect impossible speed sequences
    for (let i = 0; i < timingData.length - 1; i++) {
      if (timingData[i] < timingThresholds.superhumanThreshold &&
          timingData[i + 1] < timingThresholds.superhumanThreshold) {
        anomalies.push({
          type: 'impossible_speed',
          startIndex: i,
          endIndex: i + 1,
          severity: 0.8,
          description: `Consecutive superhuman timing detected (${timingData[i]}ms, ${timingData[i + 1]}ms)`,
        });
      }
    }

    // Detect unnatural consistency
    const consistency = this.calculateTimingConsistency(timingData);
    if (consistency > 0.95) { // Too consistent to be human
      anomalies.push({
        type: 'unnatural_consistency',
        startIndex: 0,
        endIndex: timingData.length - 1,
        severity: Math.min(1.0, (consistency - 0.9) * 10),
        description: `Timing consistency too high for human behavior (${(consistency * 100).toFixed(1)}%)`,
      });
    }

    // Detect suspicious pause patterns
    this.detectSuspiciousPauses(timingData, anomalies);

    return anomalies;
  }

  private async detectBehavioralAnomalies(
    sessionData: any,
    userProfile: UserBehaviorProfile | null,
    behaviorThresholds: any
  ): Promise<BehavioralAnomaly[]> {
    const anomalies: BehavioralAnomaly[] = [];

    if (!userProfile) {
      return anomalies; // Can't detect behavioral anomalies without profile
    }

    // Detect sudden skill jumps
    const skillAnomaly = this.detectSkillJumpAnomaly(sessionData, userProfile, behaviorThresholds);
    if (skillAnomaly) {
      anomalies.push(skillAnomaly);
    }

    // Detect pattern deviations
    const patternAnomaly = this.detectPatternDeviationAnomaly(sessionData, userProfile);
    if (patternAnomaly) {
      anomalies.push(patternAnomaly);
    }

    // Detect automation signatures
    const automationAnomaly = this.detectAutomationSignature(sessionData);
    if (automationAnomaly) {
      anomalies.push(automationAnomaly);
    }

    return anomalies;
  }

  private detectSkillJumpAnomaly(
    sessionData: any,
    userProfile: UserBehaviorProfile,
    behaviorThresholds: any
  ): BehavioralAnomaly | null {
    const currentPerformance = this.calculatePerformanceScore(sessionData);
    const expectedPerformance = userProfile.currentSkillLevel;
    
    const improvement = (currentPerformance - expectedPerformance) / expectedPerformance;
    
    if (improvement > behaviorThresholds.skillJumpThreshold) {
      return {
        type: 'skill_jump',
        severity: Math.min(1.0, improvement / 2.0),
        description: `Unexpectedly large skill improvement detected (${(improvement * 100).toFixed(1)}%)`,
        evidenceStrength: Math.min(1.0, improvement),
      };
    }

    return null;
  }

  private detectPatternDeviationAnomaly(
    sessionData: any,
    userProfile: UserBehaviorProfile
  ): BehavioralAnomaly | null {
    // Compare current session patterns with user's typical patterns
    const currentPattern = this.extractBehaviorPattern(sessionData);
    const typicalPattern = userProfile.playStyle;
    
    const deviation = this.calculatePatternDeviation(currentPattern, typicalPattern);
    
    if (deviation > 0.7) { // High deviation from typical pattern
      return {
        type: 'pattern_deviation',
        severity: Math.min(1.0, deviation),
        description: `Behavior pattern significantly differs from user's typical style`,
        evidenceStrength: deviation,
      };
    }

    return null;
  }

  private detectAutomationSignature(sessionData: any): BehavioralAnomaly | null {
    // Look for signatures of automated play
    const automationScore = this.calculateAutomationScore(sessionData);
    
    if (automationScore > 0.8) {
      return {
        type: 'automation_signature',
        severity: automationScore,
        description: `Session exhibits characteristics of automated play`,
        evidenceStrength: automationScore,
      };
    }

    return null;
  }

  // Helper methods
  private async getUserHistoricalData(userId: string): Promise<any[]> {
    const recentSessions = await this.gameSessionRepository
      .createQueryBuilder('session')
      .where('session.userId = :userId', { userId })
      .orderBy('session.createdAt', 'DESC')
      .limit(this.STATISTICAL_THRESHOLDS.ROLLING_WINDOW_SIZE)
      .getMany();

    const recentProgress = await this.puzzleProgressRepository
      .createQueryBuilder('progress')
      .where('progress.userId = :userId', { userId })
      .orderBy('progress.createdAt', 'DESC')
      .limit(this.STATISTICAL_THRESHOLDS.ROLLING_WINDOW_SIZE)
      .getMany();

    return [...recentSessions, ...recentProgress];
  }

  private async getUserBehaviorProfile(userId: string): Promise<UserBehaviorProfile | null> {
    return this.behaviorProfileRepository.findOne({
      where: { userId },
    });
  }

  private calculateSessionConsistency(sessionData: any): number {
    if (!sessionData.timingData || sessionData.timingData.length < 2) {
      return 0.5; // Neutral consistency for insufficient data
    }

    const times = sessionData.timingData;
    const mean = times.reduce((sum: number, time: number) => sum + time, 0) / times.length;
    const variance = times.reduce(
      (sum: number, time: number) => sum + Math.pow(time - mean, 2), 0
    ) / times.length;
    
    const coefficientOfVariation = Math.sqrt(variance) / mean;
    
    // Convert to consistency score (0-1, where 1 is perfectly consistent)
    return Math.max(0, Math.min(1, 1 - coefficientOfVariation));
  }

  private calculateTimingConsistency(timingData: number[]): number {
    if (timingData.length < 2) return 0;

    const mean = timingData.reduce((sum, time) => sum + time, 0) / timingData.length;
    const variance = timingData.reduce(
      (sum, time) => sum + Math.pow(time - mean, 2), 0
    ) / timingData.length;
    
    const stdDev = Math.sqrt(variance);
    const coefficientOfVariation = stdDev / mean;
    
    // Consistency is inverse of variation
    return Math.max(0, Math.min(1, 1 - coefficientOfVariation * 2));
  }

  private detectSuspiciousPauses(timingData: number[], anomalies: TemporalAnomaly[]): void {
    // Look for unnatural pause patterns
    let consecutiveFastMoves = 0;
    
    for (let i = 0; i < timingData.length; i++) {
      if (timingData[i] < 200) { // Very fast move
        consecutiveFastMoves++;
      } else {
        if (consecutiveFastMoves > 5) { // Too many fast moves in a row
          anomalies.push({
            type: 'suspicious_pause',
            startIndex: i - consecutiveFastMoves,
            endIndex: i - 1,
            severity: Math.min(1.0, consecutiveFastMoves / 10),
            description: `${consecutiveFastMoves} consecutive fast moves detected`,
          });
        }
        consecutiveFastMoves = 0;
      }
    }
  }

  private calculatePerformanceScore(sessionData: any): number {
    // Calculate a normalized performance score
    const accuracy = sessionData.accuracy || 
                    (sessionData.finalState?.score / (sessionData.maxPossibleScore || 1));
    const efficiency = 1 / Math.max(1, sessionData.moveSequence?.length || 1);
    const speed = 1 / Math.max(1, sessionData.totalTime || 1);
    
    return (accuracy * 0.5 + efficiency * 0.3 + speed * 0.2);
  }

  private extractBehaviorPattern(sessionData: any): string {
    // Extract key behavioral characteristics
    const hasLongPauses = sessionData.timingData?.some((time: number) => time > 5000) || false;
    const hasVariableTiming = this.calculateTimingConsistency(sessionData.timingData || []) < 0.7;
    const makesSuboptimalMoves = (sessionData.moveSequence?.length || 0) > (sessionData.optimalLength || 0) * 1.2;
    
    return `${hasLongPauses ? 'pauses' : 'nopauses'}-${hasVariableTiming ? 'variable' : 'consistent'}-${makesSuboptimalMoves ? 'suboptimal' : 'optimal'}`;
  }

  private calculatePatternDeviation(currentPattern: string, typicalPattern: any): number {
    // Simple pattern comparison - in reality this would be more sophisticated
    if (typeof typicalPattern !== 'string') {
      return 0.5; // Default moderate deviation for non-string patterns
    }
    
    const similarity = currentPattern === typicalPattern ? 1.0 : 0.0;
    return 1.0 - similarity;
  }

  private calculateAutomationScore(sessionData: any): number {
    let automationScore = 0;

    // Check for automation indicators
    if (sessionData.timingData) {
      const consistency = this.calculateTimingConsistency(sessionData.timingData);
      if (consistency > 0.95) automationScore += 0.3;
      
      const avgTime = sessionData.timingData.reduce((sum: number, time: number) => sum + time, 0) / 
                     sessionData.timingData.length;
      if (avgTime < 100) automationScore += 0.4; // Too fast
    }

    // Check for perfect play
    if (sessionData.accuracy > 0.99) automationScore += 0.3;

    // Check for optimal solutions
    if (sessionData.moveSequence?.length <= (sessionData.optimalLength || Infinity) * 1.05) {
      automationScore += 0.2;
    }

    return Math.min(1.0, automationScore);
  }

  private calculateAggregateRiskScore(detection: AnomalyDetection): number {
    let riskScore = 0;

    // Statistical anomalies weight
    const statWeight = detection.statisticalAnomalies.reduce(
      (sum, anomaly) => sum + anomaly.severity, 0
    ) * 0.4;

    // Temporal anomalies weight
    const tempWeight = detection.temporalAnomalies.reduce(
      (sum, anomaly) => sum + anomaly.severity, 0
    ) * 0.3;

    // Behavioral anomalies weight
    const behavWeight = detection.behavioralAnomalies.reduce(
      (sum, anomaly) => sum + anomaly.severity, 0
    ) * 0.3;

    riskScore = statWeight + tempWeight + behavWeight;

    return Math.min(1.0, riskScore);
  }
}
