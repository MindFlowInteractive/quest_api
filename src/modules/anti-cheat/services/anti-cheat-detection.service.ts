import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { 
  CheatDetectionResult, 
  AntiCheatFlags, 
  CheatSeverity,
  CheatStatus,
  CheatEvidence,
  AnomalyDetection,
  AnomalySeverity,
  CheatDetectionConfig,
  CheatDetectionModule
} from './interfaces/anti-cheat.interfaces';
import { AntiCheatValidationService } from './anti-cheat-validation.service';

export class CheatDetection {
  id: string;
  userId: string;
  puzzleId: string;
  sessionId: string;
  detectionTime: Date;
  flags: AntiCheatFlags[];
  severity: CheatSeverity;
  confidence: number;
  evidence: string; // JSON serialized CheatEvidence
  status: CheatStatus;
  reviewedBy?: string;
  reviewedAt?: Date;
  reviewNotes?: string;
  appealedAt?: Date;
  appealReason?: string;
  appealStatus?: 'pending' | 'approved' | 'rejected';
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class AntiCheatDetectionService {
  private readonly logger = new Logger(AntiCheatDetectionService.name);
  
  private config: CheatDetectionConfig = {
    enabledModules: [
      CheatDetectionModule.TIMING_ANALYSIS,
      CheatDetectionModule.MOVEMENT_PATTERNS,
      CheatDetectionModule.BEHAVIOR_PROFILING,
      CheatDetectionModule.STATISTICAL_ANALYSIS,
      CheatDetectionModule.SOLUTION_VERIFICATION,
    ],
    thresholds: {
      timingThresholds: {
        minMoveTime: 50,
        maxMoveTime: 300000,
        superhumanThreshold: 100,
        consistencyThreshold: 0.95,
        anomalyThreshold: 2.0,
      },
      behaviorThresholds: {
        accuracyThreshold: 0.98,
        optimalityThreshold: 0.95,
        improvementThreshold: 0.9,
        consistencyThreshold: 0.8,
      },
      confidenceThresholds: {
        flagThreshold: 0.3,
        reviewThreshold: 0.5,
        actionThreshold: 0.7,
        banThreshold: 0.9,
      },
    },
    sampling: {
      sampleRate: 0.1,
      intensiveMonitoring: false,
      targetedSampling: true,
      adaptiveSampling: true,
    },
    reporting: {
      realTimeAlerts: true,
      dailyReports: true,
      weeklyAnalysis: true,
      customReports: false,
      alertChannels: [],
    },
  };

  constructor(
    @InjectRepository(CheatDetection)
    private readonly cheatDetectionRepository: Repository<CheatDetection>,
    private readonly validationService: AntiCheatValidationService,
  ) {}

  async detectCheating(
    userId: string,
    puzzleId: string,
    sessionId: string,
    solutionData: any
  ): Promise<CheatDetectionResult> {
    this.logger.debug(`Running cheat detection for user ${userId}, puzzle ${puzzleId}`);

    try {
      // Get validation result from the validation service
      const validationResult = await this.validationService.validateSolution(
        puzzleId,
        userId,
        solutionData
      );

      // Perform additional anomaly detection
      const anomalyDetection = await this.performAnomalyDetection(
        userId,
        puzzleId,
        solutionData,
        validationResult
      );

      // Calculate overall severity
      const severity = this.calculateCheatSeverity(
        validationResult.cheatFlags,
        validationResult.confidence,
        anomalyDetection
      );

      // Gather evidence
      const evidence = await this.gatherEvidence(
        userId,
        puzzleId,
        solutionData,
        validationResult
      );

      // Determine status
      const status = this.determineInitialStatus(severity, validationResult.confidence);

      const detectionResult: CheatDetectionResult = {
        userId,
        puzzleId,
        sessionId,
        detectionTime: new Date(),
        flags: validationResult.cheatFlags,
        severity,
        confidence: validationResult.confidence,
        evidence,
        status,
      };

      // Save to database if flags were raised
      if (validationResult.cheatFlags.length > 0) {
        await this.saveDetectionResult(detectionResult);
      }

      // Trigger appropriate responses
      await this.triggerAutomatedResponse(detectionResult);

      return detectionResult;

    } catch (error) {
      this.logger.error(`Error in cheat detection: ${error.message}`, error.stack);
      throw error;
    }
  }

  private async performAnomalyDetection(
    userId: string,
    puzzleId: string,
    solutionData: any,
    validationResult: any
  ): Promise<AnomalyDetection> {
    const anomaly: AnomalyDetection = {
      statisticalAnomaly: false,
      behavioralAnomaly: false,
      temporalAnomaly: false,
      patternAnomaly: false,
      severity: AnomalySeverity.MINOR,
    };

    // Statistical anomaly detection
    anomaly.statisticalAnomaly = await this.detectStatisticalAnomalies(userId, solutionData);
    
    // Behavioral anomaly detection
    anomaly.behavioralAnomaly = await this.detectBehavioralAnomalies(userId, solutionData);
    
    // Temporal anomaly detection
    anomaly.temporalAnomaly = await this.detectTemporalAnomalies(userId, solutionData);
    
    // Pattern anomaly detection
    anomaly.patternAnomaly = await this.detectPatternAnomalies(puzzleId, solutionData);

    // Calculate overall severity
    const anomalyCount = [
      anomaly.statisticalAnomaly,
      anomaly.behavioralAnomaly,
      anomaly.temporalAnomaly,
      anomaly.patternAnomaly,
    ].filter(Boolean).length;

    if (anomalyCount >= 3) {
      anomaly.severity = AnomalySeverity.EXTREME;
    } else if (anomalyCount === 2) {
      anomaly.severity = AnomalySeverity.SEVERE;
    } else if (anomalyCount === 1) {
      anomaly.severity = AnomalySeverity.MODERATE;
    }

    return anomaly;
  }

  private async detectStatisticalAnomalies(userId: string, solutionData: any): Promise<boolean> {
    // Implement statistical analysis using z-scores, outlier detection, etc.
    const userStats = await this.getUserStatistics(userId);
    if (!userStats) return false;

    const currentPerformance = this.calculatePerformanceMetrics(solutionData);
    const zScore = Math.abs(
      (currentPerformance.score - userStats.averageScore) / userStats.standardDeviation
    );

    return zScore > 3; // 3 standard deviations is highly unusual
  }

  private async detectBehavioralAnomalies(userId: string, solutionData: any): Promise<boolean> {
    // Check for sudden changes in solving patterns, skill level, etc.
    const recentBehavior = await this.getRecentBehaviorProfile(userId);
    if (!recentBehavior) return false;

    const currentBehavior = this.analyzeBehaviorPattern(solutionData);
    const similarity = this.calculateBehaviorSimilarity(currentBehavior, recentBehavior);

    return similarity < 0.3; // Less than 30% similarity is suspicious
  }

  private async detectTemporalAnomalies(userId: string, solutionData: any): Promise<boolean> {
    // Analyze timing patterns for unusual characteristics
    const timingData = solutionData.timingData || [];
    if (timingData.length === 0) return false;

    // Check for impossible timing patterns
    const impossibleTimings = timingData.filter((time: number) => time < 10).length;
    const tooConsistent = this.calculateTimingConsistency(timingData) > 0.98;
    const lackOfVariation = Math.max(...timingData) / Math.min(...timingData) < 1.5;

    return impossibleTimings > timingData.length * 0.1 || tooConsistent || lackOfVariation;
  }

  private async detectPatternAnomalies(puzzleId: string, solutionData: any): Promise<boolean> {
    // Check against known bot patterns and solver signatures
    const movePattern = this.extractMovePattern(solutionData.moveSequence);
    const knownBotPatterns = await this.getKnownBotPatterns(puzzleId);
    
    for (const botPattern of knownBotPatterns) {
      const similarity = this.calculatePatternSimilarity(movePattern, botPattern);
      if (similarity > 0.9) return true; // 90% similarity to known bot pattern
    }

    return false;
  }

  private calculateCheatSeverity(
    flags: AntiCheatFlags[],
    confidence: number,
    anomaly: AnomalyDetection
  ): CheatSeverity {
    let severityScore = 0;

    // Add points for each flag type
    const flagScores = {
      [AntiCheatFlags.INVALID_STATE_TRANSITION]: 50,
      [AntiCheatFlags.SUPERHUMAN_TIMING]: 40,
      [AntiCheatFlags.BOT_SIGNATURE]: 45,
      [AntiCheatFlags.AUTOMATION_DETECTED]: 45,
      [AntiCheatFlags.MEMORY_MANIPULATION]: 50,
      [AntiCheatFlags.PERFECT_SOLUTION]: 25,
      [AntiCheatFlags.IMPOSSIBLE_IMPROVEMENT]: 35,
      [AntiCheatFlags.INHUMAN_CONSISTENCY]: 30,
    };

    for (const flag of flags) {
      severityScore += flagScores[flag] || 10;
    }

    // Adjust for confidence
    severityScore *= confidence;

    // Adjust for anomaly severity
    const anomalyMultiplier = {
      [AnomalySeverity.MINOR]: 1.0,
      [AnomalySeverity.MODERATE]: 1.2,
      [AnomalySeverity.SEVERE]: 1.5,
      [AnomalySeverity.EXTREME]: 2.0,
    };
    severityScore *= anomalyMultiplier[anomaly.severity];

    // Determine final severity
    if (severityScore >= 80) return CheatSeverity.CRITICAL;
    if (severityScore >= 50) return CheatSeverity.HIGH;
    if (severityScore >= 25) return CheatSeverity.MEDIUM;
    return CheatSeverity.LOW;
  }

  private async gatherEvidence(
    userId: string,
    puzzleId: string,
    solutionData: any,
    validationResult: any
  ): Promise<CheatEvidence> {
    const evidence: CheatEvidence = {
      timingEvidence: {
        superhumanIntervals: [],
        impossibleConsistency: 0,
        suspiciousPatterns: [],
        comparisonData: {
          userAverage: 0,
          globalAverage: 0,
          percentile: 0,
          deviation: 0,
        },
      },
      movementEvidence: {
        perfectMoves: [],
        repetitivePatterns: [],
        impossibleOptimization: 0,
        knownBotSignatures: [],
      },
      behaviorEvidence: {
        skillJumps: [],
        inconsistentPerformance: [],
        unnaturalPatterns: [],
        missingHumanTraits: [],
      },
      technicalEvidence: {
        inputPatterns: [],
        systemMetrics: {
          cpuUsage: [],
          memoryUsage: [],
          networkLatency: [],
          suspiciousProcesses: [],
        },
        networkAnalysis: {
          latencyPattern: [],
          packetTiming: [],
          suspiciousTraffic: false,
          vpnDetection: false,
        },
        environmentalFactors: {
          browserInfo: {
            userAgent: '',
            viewport: { width: 0, height: 0 },
            timezone: '',
            language: '',
            plugins: [],
          },
          systemInfo: {
            platform: '',
            cpuCores: 0,
            memoryGB: 0,
            screenResolution: '',
            colorDepth: 0,
          },
          locationInfo: {
            country: '',
            region: '',
            city: '',
            isp: '',
            suspicious: false,
          },
          deviceFingerprint: {
            hash: '',
            confidence: 0,
            uniqueness: 0,
            riskScore: 0,
          },
        },
      },
    };

    // Gather timing evidence
    if (validationResult.analysis.timingAnalysis) {
      const timingAnalysis = validationResult.analysis.timingAnalysis;
      evidence.timingEvidence.superhumanIntervals = timingAnalysis.suspiciousIntervals;
      evidence.timingEvidence.impossibleConsistency = 1 - timingAnalysis.humanLikelihood;
      evidence.timingEvidence.comparisonData = await this.getTimingComparison(userId, solutionData);
    }

    // Gather movement evidence
    if (validationResult.analysis.movementAnalysis) {
      const movementAnalysis = validationResult.analysis.movementAnalysis;
      evidence.movementEvidence.impossibleOptimization = movementAnalysis.efficiency;
      evidence.movementEvidence.knownBotSignatures = await this.checkBotSignatures(
        movementAnalysis.patternSignature
      );
    }

    // Gather behavior evidence
    if (validationResult.analysis.behaviorAnalysis) {
      const behaviorAnalysis = validationResult.analysis.behaviorAnalysis;
      evidence.behaviorEvidence.skillJumps = await this.detectSkillJumps(userId, solutionData);
      evidence.behaviorEvidence.missingHumanTraits = this.identifyMissingHumanTraits(solutionData);
    }

    return evidence;
  }

  private determineInitialStatus(severity: CheatSeverity, confidence: number): CheatStatus {
    if (confidence > this.config.thresholds.confidenceThresholds.banThreshold) {
      return CheatStatus.CONFIRMED;
    }
    if (confidence > this.config.thresholds.confidenceThresholds.reviewThreshold) {
      return CheatStatus.UNDER_REVIEW;
    }
    return CheatStatus.DETECTED;
  }

  private async triggerAutomatedResponse(result: CheatDetectionResult): Promise<void> {
    switch (result.severity) {
      case CheatSeverity.CRITICAL:
        await this.handleCriticalCheat(result);
        break;
      case CheatSeverity.HIGH:
        await this.handleHighSeverityCheat(result);
        break;
      case CheatSeverity.MEDIUM:
        await this.handleMediumSeverityCheat(result);
        break;
      case CheatSeverity.LOW:
        await this.handleLowSeverityCheat(result);
        break;
    }
  }

  private async handleCriticalCheat(result: CheatDetectionResult): Promise<void> {
    this.logger.warn(`CRITICAL cheat detected for user ${result.userId}`);
    
    // Immediate temporary ban
    await this.temporaryBanUser(result.userId, '24h', 'Automated: Critical cheat detection');
    
    // Flag for immediate manual review
    await this.flagForManualReview(result, 'high');
    
    // Send alert to moderators
    await this.sendModeratorAlert(result, 'critical');
    
    // Log security event
    await this.logSecurityEvent(result, 'critical_cheat_detected');
  }

  private async handleHighSeverityCheat(result: CheatDetectionResult): Promise<void> {
    this.logger.warn(`HIGH severity cheat detected for user ${result.userId}`);
    
    // Increase monitoring
    await this.increaseUserMonitoring(result.userId, 7); // 7 days
    
    // Flag for manual review
    await this.flagForManualReview(result, 'medium');
    
    // Send alert to moderators
    await this.sendModeratorAlert(result, 'high');
  }

  private async handleMediumSeverityCheat(result: CheatDetectionResult): Promise<void> {
    this.logger.log(`MEDIUM severity cheat detected for user ${result.userId}`);
    
    // Flag for manual review
    await this.flagForManualReview(result, 'low');
    
    // Add to watch list
    await this.addToWatchList(result.userId, 3); // 3 days
  }

  private async handleLowSeverityCheat(result: CheatDetectionResult): Promise<void> {
    this.logger.debug(`LOW severity cheat detected for user ${result.userId}`);
    
    // Just log and monitor
    await this.logAnomaly(result);
  }

  // Helper methods (implementations would be more detailed in practice)
  private async saveDetectionResult(result: CheatDetectionResult): Promise<void> {
    const detection = new CheatDetection();
    detection.userId = result.userId;
    detection.puzzleId = result.puzzleId;
    detection.sessionId = result.sessionId;
    detection.detectionTime = result.detectionTime;
    detection.flags = result.flags;
    detection.severity = result.severity;
    detection.confidence = result.confidence;
    detection.evidence = JSON.stringify(result.evidence);
    detection.status = result.status;
    detection.createdAt = new Date();
    detection.updatedAt = new Date();

    await this.cheatDetectionRepository.save(detection);
  }

  private async getUserStatistics(userId: string): Promise<any> {
    // Implementation would query user's historical performance
    return null;
  }

  private calculatePerformanceMetrics(solutionData: any): any {
    // Implementation would calculate current performance metrics
    return { score: 0 };
  }

  private async getRecentBehaviorProfile(userId: string): Promise<any> {
    // Implementation would get user's recent behavior patterns
    return null;
  }

  private analyzeBehaviorPattern(solutionData: any): any {
    // Implementation would analyze current behavior pattern
    return {};
  }

  private calculateBehaviorSimilarity(current: any, historical: any): number {
    // Implementation would calculate similarity between behavior patterns
    return 1.0;
  }

  private calculateTimingConsistency(timingData: number[]): number {
    if (timingData.length < 2) return 0;
    
    const mean = timingData.reduce((sum, time) => sum + time, 0) / timingData.length;
    const variance = timingData.reduce((sum, time) => sum + Math.pow(time - mean, 2), 0) / timingData.length;
    const standardDeviation = Math.sqrt(variance);
    
    return 1 - (standardDeviation / mean); // Higher value = more consistent
  }

  private extractMovePattern(moveSequence: any[]): string {
    // Implementation would extract a pattern signature from moves
    return '';
  }

  private async getKnownBotPatterns(puzzleId: string): Promise<string[]> {
    // Implementation would get known bot patterns for this puzzle type
    return [];
  }

  private calculatePatternSimilarity(pattern1: string, pattern2: string): number {
    // Implementation would calculate similarity between patterns
    return 0;
  }

  private async getTimingComparison(userId: string, solutionData: any): Promise<any> {
    // Implementation would get timing comparison data
    return { userAverage: 0, globalAverage: 0, percentile: 0, deviation: 0 };
  }

  private async checkBotSignatures(patternSignature: string): Promise<string[]> {
    // Implementation would check against known bot signatures
    return [];
  }

  private async detectSkillJumps(userId: string, solutionData: any): Promise<any[]> {
    // Implementation would detect unusual skill improvements
    return [];
  }

  private identifyMissingHumanTraits(solutionData: any): string[] {
    const missingTraits: string[] = [];
    
    // Check for natural pauses
    const timingData = solutionData.timingData || [];
    const hasNaturalPauses = timingData.some((time: number) => time > 3000);
    if (!hasNaturalPauses) {
      missingTraits.push('natural_thinking_pauses');
    }
    
    // Check for timing variation
    if (timingData.length > 1) {
      const variation = this.calculateTimingConsistency(timingData);
      if (variation > 0.95) {
        missingTraits.push('natural_timing_variation');
      }
    }
    
    // Check for suboptimal moves
    const hasSuboptimalMoves = solutionData.moveSequence?.length > 0;
    if (!hasSuboptimalMoves) {
      missingTraits.push('suboptimal_exploration');
    }
    
    return missingTraits;
  }

  // Automated response methods
  private async temporaryBanUser(userId: string, duration: string, reason: string): Promise<void> {
    this.logger.warn(`Temporarily banning user ${userId} for ${duration}: ${reason}`);
    // Implementation would ban the user
  }

  private async flagForManualReview(result: CheatDetectionResult, priority: string): Promise<void> {
    this.logger.log(`Flagging ${result.userId} for manual review (priority: ${priority})`);
    // Implementation would add to manual review queue
  }

  private async sendModeratorAlert(result: CheatDetectionResult, level: string): Promise<void> {
    this.logger.log(`Sending ${level} alert to moderators for user ${result.userId}`);
    // Implementation would send alerts to moderators
  }

  private async logSecurityEvent(result: CheatDetectionResult, eventType: string): Promise<void> {
    this.logger.warn(`Security event: ${eventType} for user ${result.userId}`);
    // Implementation would log security events
  }

  private async increaseUserMonitoring(userId: string, days: number): Promise<void> {
    this.logger.log(`Increasing monitoring for user ${userId} for ${days} days`);
    // Implementation would increase monitoring intensity
  }

  private async addToWatchList(userId: string, days: number): Promise<void> {
    this.logger.log(`Adding user ${userId} to watch list for ${days} days`);
    // Implementation would add to watch list
  }

  private async logAnomaly(result: CheatDetectionResult): Promise<void> {
    this.logger.debug(`Logging anomaly for user ${result.userId}`);
    // Implementation would log the anomaly
  }
}
