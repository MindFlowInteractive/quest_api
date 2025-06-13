import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PuzzleState, PuzzleMove } from '../../puzzle/interfaces/puzzle.interfaces';
import { PuzzleProgress } from '../../puzzle/entities/puzzle-progress.entity';
import { GameSession } from '../../game-session/entities/game-session.entity';
import { 
  SolutionValidationResult, 
  CheatDetectionResult, 
  AntiCheatFlags,
  ValidationMetrics,
  MovementPattern,
  TimingAnalysis,
  BehaviorProfile,
  AnomalyDetection
} from './interfaces/anti-cheat.interfaces';
import { StateTransitionValidator } from '../../puzzle/solver/state-transition.validator';

@Injectable()
export class AntiCheatValidationService {
  private readonly logger = new Logger(AntiCheatValidationService.name);
  
  // Threshold constants for anomaly detection
  private readonly TIMING_THRESHOLDS = {
    MIN_MOVE_TIME: 50, // Minimum milliseconds between moves
    MAX_MOVE_TIME: 300000, // Maximum 5 minutes per move
    SUPERHUMAN_THRESHOLD: 100, // Moves faster than humanly possible
    INCONSISTENT_VARIANCE: 0.95, // High variance in timing suggests automation
  };
  
  private readonly BEHAVIOR_THRESHOLDS = {
    PERFECT_ACCURACY_THRESHOLD: 0.98, // >98% accuracy is suspicious
    MAX_CONSECUTIVE_OPTIMAL: 10, // Too many optimal moves in a row
    PATTERN_REPETITION_LIMIT: 3, // Same movement pattern repeated
    IMPOSSIBLE_PROGRESSION: 0.9, // Progress rate too high for difficulty
  };

  constructor(
    @InjectRepository(PuzzleProgress)
    private readonly puzzleProgressRepository: Repository<PuzzleProgress>,
    @InjectRepository(GameSession)
    private readonly gameSessionRepository: Repository<GameSession>,
    private readonly stateTransitionValidator: StateTransitionValidator,
  ) {}

  async validateSolution(
    puzzleId: string,
    userId: string,
    solutionData: {
      initialState: PuzzleState;
      finalState: PuzzleState;
      moveSequence: PuzzleMove[];
      timingData: number[];
      sessionId: string;
    }
  ): Promise<SolutionValidationResult> {
    this.logger.debug(`Validating solution for puzzle ${puzzleId}, user ${userId}`);

    const validationResult: SolutionValidationResult = {
      isValid: false,
      isLegitimate: false,
      cheatFlags: [],
      confidence: 0,
      analysis: {
        stateValidation: false,
        timingAnalysis: null,
        movementAnalysis: null,
        behaviorAnalysis: null,
      },
      recommendations: [],
    };

    try {
      // 1. Validate state transitions
      const stateValidation = await this.validateStateTransitions(
        solutionData.initialState,
        solutionData.finalState,
        solutionData.moveSequence
      );
      validationResult.analysis.stateValidation = stateValidation.isValid;
      
      if (!stateValidation.isValid) {
        validationResult.cheatFlags.push(AntiCheatFlags.INVALID_STATE_TRANSITION);
        return validationResult;
      }

      // 2. Analyze timing patterns
      const timingAnalysis = await this.analyzeTimingPatterns(
        solutionData.timingData,
        solutionData.moveSequence,
        userId
      );
      validationResult.analysis.timingAnalysis = timingAnalysis;
      validationResult.cheatFlags.push(...timingAnalysis.flags);

      // 3. Analyze movement patterns
      const movementAnalysis = await this.analyzeMovementPatterns(
        solutionData.moveSequence,
        puzzleId
      );
      validationResult.analysis.movementAnalysis = movementAnalysis;
      validationResult.cheatFlags.push(...movementAnalysis.flags);

      // 4. Behavioral analysis
      const behaviorAnalysis = await this.analyzeBehaviorProfile(
        userId,
        puzzleId,
        solutionData
      );
      validationResult.analysis.behaviorAnalysis = behaviorAnalysis;
      validationResult.cheatFlags.push(...behaviorAnalysis.flags);

      // 5. Calculate overall confidence and legitimacy
      const confidence = this.calculateConfidenceScore(validationResult.cheatFlags);
      validationResult.confidence = confidence;
      validationResult.isValid = stateValidation.isValid;
      validationResult.isLegitimate = confidence > 0.7 && validationResult.cheatFlags.length === 0;

      // 6. Generate recommendations
      validationResult.recommendations = this.generateRecommendations(validationResult);

      this.logger.log(
        `Solution validation complete for ${puzzleId}/${userId}: ` +
        `Valid=${validationResult.isValid}, Legitimate=${validationResult.isLegitimate}, ` +
        `Confidence=${validationResult.confidence}, Flags=${validationResult.cheatFlags.length}`
      );

      return validationResult;

    } catch (error) {
      this.logger.error(`Error validating solution: ${error.message}`, error.stack);
      validationResult.cheatFlags.push(AntiCheatFlags.VALIDATION_ERROR);
      return validationResult;
    }
  }

  private async validateStateTransitions(
    initialState: PuzzleState,
    finalState: PuzzleState,
    moveSequence: PuzzleMove[]
  ): Promise<{ isValid: boolean; invalidMoves: number[] }> {
    const invalidMoves: number[] = [];
    let currentState = { ...initialState };

    for (let i = 0; i < moveSequence.length; i++) {
      const move = moveSequence[i];
      const previousState = { ...currentState };

      // Simulate applying the move
      const nextState = this.applyMoveToState(currentState, move);
      
      // Validate the transition
      const isValidTransition = this.stateTransitionValidator.validateTransition(
        initialState.puzzleType,
        previousState,
        nextState
      );

      if (!isValidTransition) {
        invalidMoves.push(i);
      }

      currentState = nextState;
    }

    // Verify final state matches
    const finalStateMatches = this.compareStates(currentState, finalState);

    return {
      isValid: invalidMoves.length === 0 && finalStateMatches,
      invalidMoves,
    };
  }

  private async analyzeTimingPatterns(
    timingData: number[],
    moveSequence: PuzzleMove[],
    userId: string
  ): Promise<TimingAnalysis> {
    const analysis: TimingAnalysis = {
      averageTime: 0,
      variance: 0,
      suspiciousIntervals: [],
      flags: [],
      humanLikelihood: 0,
    };

    if (timingData.length === 0) {
      analysis.flags.push(AntiCheatFlags.MISSING_TIMING_DATA);
      return analysis;
    }

    // Calculate basic statistics
    analysis.averageTime = timingData.reduce((sum, time) => sum + time, 0) / timingData.length;
    const variance = timingData.reduce((sum, time) => sum + Math.pow(time - analysis.averageTime, 2), 0) / timingData.length;
    analysis.variance = Math.sqrt(variance);

    // Detect superhuman timing
    const superhumanMoves = timingData.filter(time => time < this.TIMING_THRESHOLDS.SUPERHUMAN_THRESHOLD);
    if (superhumanMoves.length > timingData.length * 0.1) { // More than 10% superhuman
      analysis.flags.push(AntiCheatFlags.SUPERHUMAN_TIMING);
    }

    // Detect impossible consistency (bots tend to have very consistent timing)
    const coefficientOfVariation = analysis.variance / analysis.averageTime;
    if (coefficientOfVariation < 0.05) { // Less than 5% variation
      analysis.flags.push(AntiCheatFlags.INHUMAN_CONSISTENCY);
    }

    // Detect temporal anomalies
    for (let i = 0; i < timingData.length - 1; i++) {
      const currentTime = timingData[i];
      const nextTime = timingData[i + 1];
      
      // Look for impossible speed changes
      if (currentTime < this.TIMING_THRESHOLDS.MIN_MOVE_TIME && 
          nextTime < this.TIMING_THRESHOLDS.MIN_MOVE_TIME) {
        analysis.suspiciousIntervals.push(i);
      }
    }

    // Get user's historical timing patterns for comparison
    const historicalPattern = await this.getUserTimingProfile(userId);
    if (historicalPattern) {
      const deviationFromNormal = Math.abs(analysis.averageTime - historicalPattern.averageTime) / historicalPattern.averageTime;
      if (deviationFromNormal > 2.0) { // More than 200% deviation
        analysis.flags.push(AntiCheatFlags.TIMING_ANOMALY);
      }
    }

    // Calculate human likelihood based on natural timing patterns
    analysis.humanLikelihood = this.calculateHumanLikelihood(timingData);

    return analysis;
  }

  private async analyzeMovementPatterns(
    moveSequence: PuzzleMove[],
    puzzleId: string
  ): Promise<MovementPattern> {
    const analysis: MovementPattern = {
      efficiency: 0,
      optimality: 0,
      repetitiveness: 0,
      flags: [],
      patternSignature: '',
    };

    if (moveSequence.length === 0) {
      analysis.flags.push(AntiCheatFlags.EMPTY_MOVE_SEQUENCE);
      return analysis;
    }

    // Calculate move efficiency (shorter solutions are more suspicious if too optimal)
    const optimalSolutionLength = await this.getOptimalSolutionLength(puzzleId);
    analysis.efficiency = optimalSolutionLength / moveSequence.length;
    
    if (analysis.efficiency > 0.98) { // Too close to optimal
      analysis.flags.push(AntiCheatFlags.PERFECT_SOLUTION);
    }

    // Analyze move optimality
    let optimalMoves = 0;
    for (const move of moveSequence) {
      if (await this.isMoveOptimal(move, puzzleId)) {
        optimalMoves++;
      }
    }
    
    analysis.optimality = optimalMoves / moveSequence.length;
    if (analysis.optimality > this.BEHAVIOR_THRESHOLDS.PERFECT_ACCURACY_THRESHOLD) {
      analysis.flags.push(AntiCheatFlags.TOO_OPTIMAL);
    }

    // Detect repetitive patterns
    analysis.repetitiveness = this.detectPatternRepetition(moveSequence);
    if (analysis.repetitiveness > this.BEHAVIOR_THRESHOLDS.PATTERN_REPETITION_LIMIT) {
      analysis.flags.push(AntiCheatFlags.REPETITIVE_PATTERNS);
    }

    // Generate pattern signature for future comparison
    analysis.patternSignature = this.generatePatternSignature(moveSequence);

    return analysis;
  }

  private async analyzeBehaviorProfile(
    userId: string,
    puzzleId: string,
    solutionData: any
  ): Promise<BehaviorProfile> {
    const profile: BehaviorProfile = {
      consistencyScore: 0,
      skillProgression: 0,
      typicalBehavior: false,
      flags: [],
    };

    // Get user's historical performance
    const historicalData = await this.getUserHistoricalData(userId);
    
    if (historicalData.length > 0) {
      // Analyze consistency with past performance
      profile.consistencyScore = this.calculateConsistencyScore(solutionData, historicalData);
      
      // Check for impossible skill jumps
      profile.skillProgression = this.analyzeSkillProgression(solutionData, historicalData);
      
      if (profile.skillProgression > this.BEHAVIOR_THRESHOLDS.IMPOSSIBLE_PROGRESSION) {
        profile.flags.push(AntiCheatFlags.IMPOSSIBLE_IMPROVEMENT);
      }
    }

    // Check if behavior matches typical human patterns
    profile.typicalBehavior = this.isTypicalHumanBehavior(solutionData);
    if (!profile.typicalBehavior) {
      profile.flags.push(AntiCheatFlags.ATYPICAL_BEHAVIOR);
    }

    return profile;
  }

  // Helper methods
  private applyMoveToState(state: PuzzleState, move: PuzzleMove): PuzzleState {
    // Implementation depends on puzzle type - this is a simplified version
    const newState = { ...state };
    // Apply move logic here based on puzzle type
    return newState;
  }

  private compareStates(state1: PuzzleState, state2: PuzzleState): boolean {
    // Deep comparison of puzzle states
    return JSON.stringify(state1.data) === JSON.stringify(state2.data);
  }

  private async getUserTimingProfile(userId: string): Promise<{ averageTime: number; variance: number } | null> {
    // Get user's historical timing data from database
    const recentSessions = await this.gameSessionRepository
      .createQueryBuilder('session')
      .where('session.userId = :userId', { userId })
      .orderBy('session.createdAt', 'DESC')
      .limit(10)
      .getMany();

    if (recentSessions.length === 0) return null;

    // Calculate average timing from historical data
    const totalTime = recentSessions.reduce((sum, session) => sum + Number(session.duration), 0);
    const averageTime = totalTime / recentSessions.length;
    
    // Calculate variance
    const variance = recentSessions.reduce(
      (sum, session) => sum + Math.pow(Number(session.duration) - averageTime, 2),
      0
    ) / recentSessions.length;

    return { averageTime, variance: Math.sqrt(variance) };
  }

  private calculateHumanLikelihood(timingData: number[]): number {
    // Analyze timing distribution for human-like characteristics
    // Humans typically have log-normal distribution in reaction times
    let humanScore = 1.0;

    // Check for natural variability
    const mean = timingData.reduce((sum, time) => sum + time, 0) / timingData.length;
    const variance = timingData.reduce((sum, time) => sum + Math.pow(time - mean, 2), 0) / timingData.length;
    const cv = Math.sqrt(variance) / mean;

    // Human coefficient of variation is typically 0.1-0.4
    if (cv < 0.05 || cv > 0.6) {
      humanScore -= 0.3;
    }

    // Check for natural pauses and thinking time
    const longPauses = timingData.filter(time => time > 5000).length; // >5 seconds
    const expectedPauses = Math.max(1, timingData.length * 0.1);
    
    if (longPauses < expectedPauses) {
      humanScore -= 0.2; // Lack of thinking time is suspicious
    }

    return Math.max(0, humanScore);
  }

  private async getOptimalSolutionLength(puzzleId: string): Promise<number> {
    // This would query pre-computed optimal solutions or calculate on demand
    // For now, return a placeholder
    return 20; // Default optimal length
  }

  private async isMoveOptimal(move: PuzzleMove, puzzleId: string): Promise<boolean> {
    // Check if the move is part of an optimal solution path
    // This would require puzzle-specific analysis
    return Math.random() > 0.5; // Placeholder
  }

  private detectPatternRepetition(moveSequence: PuzzleMove[]): number {
    // Detect repetitive movement patterns
    const patterns = new Map<string, number>();
    let maxRepetitions = 0;

    for (let length = 2; length <= Math.min(10, moveSequence.length / 2); length++) {
      for (let i = 0; i <= moveSequence.length - length; i++) {
        const pattern = moveSequence.slice(i, i + length).map(m => m.type).join(',');
        const count = (patterns.get(pattern) || 0) + 1;
        patterns.set(pattern, count);
        maxRepetitions = Math.max(maxRepetitions, count);
      }
    }

    return maxRepetitions;
  }

  private generatePatternSignature(moveSequence: PuzzleMove[]): string {
    // Generate a hash signature of the movement pattern
    const patternString = moveSequence.map(m => `${m.type}:${JSON.stringify(m.data)}`).join('|');
    return require('crypto').createHash('sha256').update(patternString).digest('hex').substring(0, 16);
  }

  private async getUserHistoricalData(userId: string): Promise<any[]> {
    // Get user's recent puzzle performance data
    const recentProgress = await this.puzzleProgressRepository
      .createQueryBuilder('progress')
      .where('progress.userId = :userId', { userId })
      .andWhere('progress.status = :status', { status: 'completed' })
      .orderBy('progress.completedAt', 'DESC')
      .limit(20)
      .getMany();

    return recentProgress;
  }

  private calculateConsistencyScore(currentData: any, historicalData: any[]): number {
    // Compare current performance with historical patterns
    if (historicalData.length === 0) return 0.5; // Neutral for new users

    const avgHistoricalTime = historicalData.reduce(
      (sum, data) => sum + (data.bestTime || 0), 0
    ) / historicalData.length;

    const currentTime = currentData.timingData.reduce((sum: number, time: number) => sum + time, 0);
    const deviation = Math.abs(currentTime - avgHistoricalTime) / avgHistoricalTime;

    // Return consistency score (1.0 = perfectly consistent, 0.0 = completely inconsistent)
    return Math.max(0, 1 - deviation);
  }

  private analyzeSkillProgression(currentData: any, historicalData: any[]): number {
    // Analyze if skill improvement is realistic
    if (historicalData.length < 3) return 0.5; // Not enough data

    const recentAverage = historicalData.slice(0, 5).reduce(
      (sum, data) => sum + (data.currentScore || 0), 0
    ) / Math.min(5, historicalData.length);

    const currentScore = currentData.finalState?.score || 0;
    
    if (recentAverage === 0) return 0.5;
    
    const improvement = (currentScore - recentAverage) / recentAverage;
    return Math.min(1.0, improvement); // Cap at 100% improvement
  }

  private isTypicalHumanBehavior(solutionData: any): boolean {
    // Check for human-like characteristics in solving pattern
    
    // Humans typically make some suboptimal moves
    const hasSuboptimalMoves = solutionData.moveSequence.length > 0;
    
    // Humans show variation in timing
    const timingVariation = solutionData.timingData.length > 1 && 
      Math.max(...solutionData.timingData) / Math.min(...solutionData.timingData) > 2;
    
    // Humans typically have some pauses for thinking
    const hasThinkingPauses = solutionData.timingData.some((time: number) => time > 3000);

    return hasSuboptimalMoves && timingVariation && hasThinkingPauses;
  }

  private calculateConfidenceScore(flags: AntiCheatFlags[]): number {
    // Start with high confidence
    let confidence = 1.0;

    // Reduce confidence based on flags
    const flagWeights = {
      [AntiCheatFlags.INVALID_STATE_TRANSITION]: -0.9,
      [AntiCheatFlags.SUPERHUMAN_TIMING]: -0.7,
      [AntiCheatFlags.INHUMAN_CONSISTENCY]: -0.6,
      [AntiCheatFlags.PERFECT_SOLUTION]: -0.5,
      [AntiCheatFlags.TOO_OPTIMAL]: -0.4,
      [AntiCheatFlags.IMPOSSIBLE_IMPROVEMENT]: -0.8,
      [AntiCheatFlags.ATYPICAL_BEHAVIOR]: -0.3,
      [AntiCheatFlags.TIMING_ANOMALY]: -0.4,
      [AntiCheatFlags.REPETITIVE_PATTERNS]: -0.3,
      [AntiCheatFlags.VALIDATION_ERROR]: -0.5,
      [AntiCheatFlags.MISSING_TIMING_DATA]: -0.2,
      [AntiCheatFlags.EMPTY_MOVE_SEQUENCE]: -0.9,
    };

    for (const flag of flags) {
      confidence += flagWeights[flag] || -0.1;
    }

    return Math.max(0, Math.min(1, confidence));
  }

  private generateRecommendations(result: SolutionValidationResult): string[] {
    const recommendations: string[] = [];

    if (result.cheatFlags.includes(AntiCheatFlags.SUPERHUMAN_TIMING)) {
      recommendations.push('Review user for possible automation tools');
    }

    if (result.cheatFlags.includes(AntiCheatFlags.PERFECT_SOLUTION)) {
      recommendations.push('Verify solution against known solver outputs');
    }

    if (result.cheatFlags.includes(AntiCheatFlags.IMPOSSIBLE_IMPROVEMENT)) {
      recommendations.push('Flag for manual review of skill progression');
    }

    if (result.confidence < 0.3) {
      recommendations.push('Consider temporary restriction pending investigation');
    } else if (result.confidence < 0.7) {
      recommendations.push('Increase monitoring for this user');
    }

    if (result.cheatFlags.length === 0 && result.confidence > 0.9) {
      recommendations.push('User behavior appears normal');
    }

    return recommendations;
  }
}
