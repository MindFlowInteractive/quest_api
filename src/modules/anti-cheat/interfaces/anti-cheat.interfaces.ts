export interface SolutionValidationResult {
  isValid: boolean;
  isLegitimate: boolean;
  cheatFlags: AntiCheatFlags[];
  confidence: number; // 0-1 score
  analysis: {
    stateValidation: boolean;
    timingAnalysis: TimingAnalysis | null;
    movementAnalysis: MovementPattern | null;
    behaviorAnalysis: BehaviorProfile | null;
  };
  recommendations: string[];
}

export interface CheatDetectionResult {
  userId: string;
  puzzleId: string;
  sessionId: string;
  detectionTime: Date;
  severity: CheatSeverity;
  flags: AntiCheatFlags[];
  evidence: CheatEvidence;
  confidence: number;
  autoAction: AutoActionType;
  requiresManualReview: boolean;
}

export interface ValidationMetrics {
  totalValidations: number;
  flaggedAttempts: number;
  falsePositives: number;
  confirmedCheats: number;
  averageConfidence: number;
  commonFlags: Record<AntiCheatFlags, number>;
}

export interface TimingAnalysis {
  averageTime: number;
  variance: number;
  suspiciousIntervals: number[];
  flags: AntiCheatFlags[];
  humanLikelihood: number; // 0-1 score
}

export interface MovementPattern {
  efficiency: number; // How close to optimal solution
  optimality: number; // Percentage of optimal moves
  repetitiveness: number; // Pattern repetition score
  flags: AntiCheatFlags[];
  patternSignature: string; // Hash of movement pattern
}

export interface BehaviorProfile {
  consistencyScore: number; // How consistent with past behavior
  skillProgression: number; // Rate of improvement
  typicalBehavior: boolean; // Matches human patterns
  flags: AntiCheatFlags[];
}

export interface AnomalyDetection {
  statisticalAnomalies: StatisticalAnomaly[];
  temporalAnomalies: TemporalAnomaly[];
  behavioralAnomalies: BehavioralAnomaly[];
  aggregateRiskScore: number;
}

export interface StatisticalAnomaly {
  type: 'timing' | 'accuracy' | 'efficiency' | 'consistency';
  severity: number; // 0-1
  description: string;
  expectedRange: [number, number];
  actualValue: number;
  zScore: number;
}

export interface TemporalAnomaly {
  type: 'impossible_speed' | 'unnatural_consistency' | 'suspicious_pause';
  startIndex: number;
  endIndex: number;
  severity: number;
  description: string;
}

export interface BehavioralAnomaly {
  type: 'skill_jump' | 'pattern_deviation' | 'automation_signature';
  severity: number;
  description: string;
  evidenceStrength: number;
}

export interface CheatEvidence {
  timingEvidence: TimingEvidence[];
  movementEvidence: MovementEvidence[];
  behavioralEvidence: BehavioralEvidence[];
  technicalEvidence: TechnicalEvidence[];
}

export interface TimingEvidence {
  type: 'superhuman' | 'consistent' | 'impossible' | 'anomalous';
  timestamps: number[];
  values: number[];
  description: string;
  severity: number;
}

export interface MovementEvidence {
  type: 'perfect' | 'optimal' | 'repetitive' | 'mechanical';
  moveSequence: number[]; // Indices of suspicious moves
  patternDescription: string;
  severity: number;
}

export interface BehavioralEvidence {
  type: 'skill_anomaly' | 'consistency_break' | 'inhuman_pattern';
  comparisonData: any;
  description: string;
  severity: number;
}

export interface TechnicalEvidence {
  type: 'automation' | 'modified_client' | 'impossible_state';
  technicalDetails: any;
  description: string;
  severity: number;
}

export enum AntiCheatFlags {
  // State Validation
  INVALID_STATE_TRANSITION = 'invalid_state_transition',
  IMPOSSIBLE_MOVE = 'impossible_move',
  STATE_MANIPULATION = 'state_manipulation',
  
  // Timing Anomalies
  SUPERHUMAN_TIMING = 'superhuman_timing',
  INHUMAN_CONSISTENCY = 'inhuman_consistency',
  TIMING_ANOMALY = 'timing_anomaly',
  IMPOSSIBLE_REACTION_TIME = 'impossible_reaction_time',
  AUTOMATED_TIMING = 'automated_timing',
  
  // Movement Patterns
  PERFECT_SOLUTION = 'perfect_solution',
  TOO_OPTIMAL = 'too_optimal',
  REPETITIVE_PATTERNS = 'repetitive_patterns',
  MECHANICAL_MOVEMENT = 'mechanical_movement',
  SOLVER_SIGNATURE = 'solver_signature',
  
  // Behavioral Anomalies
  IMPOSSIBLE_IMPROVEMENT = 'impossible_improvement',
  SKILL_INCONSISTENCY = 'skill_inconsistency',
  ATYPICAL_BEHAVIOR = 'atypical_behavior',
  SUDDEN_EXPERTISE = 'sudden_expertise',
  
  // Technical Issues
  MISSING_TIMING_DATA = 'missing_timing_data',
  EMPTY_MOVE_SEQUENCE = 'empty_move_sequence',
  VALIDATION_ERROR = 'validation_error',
  CLIENT_MANIPULATION = 'client_manipulation',
  
  // Statistical Anomalies
  OUTLIER_PERFORMANCE = 'outlier_performance',
  IMPOSSIBLE_STATISTICS = 'impossible_statistics',
  INCONSISTENT_METRICS = 'inconsistent_metrics',
}

export enum CheatSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export enum AutoActionType {
  NONE = 'none',
  FLAG_FOR_REVIEW = 'flag_for_review',
  TEMPORARY_RESTRICTION = 'temporary_restriction',
  INVALIDATE_SCORE = 'invalidate_score',
  SUSPEND_ACCOUNT = 'suspend_account',
  PERMANENT_BAN = 'permanent_ban',
}

export interface CheatDetectionConfig {
  enableRealTimeDetection: boolean;
  enableBehavioralAnalysis: boolean;
  enableStatisticalAnalysis: boolean;
  timingThresholds: TimingThresholds;
  behaviorThresholds: BehaviorThresholds;
  autoActionThresholds: AutoActionThresholds;
  falsePositiveReduction: FalsePositiveConfig;
}

export interface TimingThresholds {
  minMoveTime: number;
  maxMoveTime: number;
  superhumanThreshold: number;
  consistencyThreshold: number;
  anomalyZScore: number;
}

export interface BehaviorThresholds {
  perfectAccuracyThreshold: number;
  maxConsecutiveOptimal: number;
  patternRepetitionLimit: number;
  impossibleProgressionRate: number;
  skillJumpThreshold: number;
}

export interface AutoActionThresholds {
  flagThreshold: number;
  restrictionThreshold: number;
  suspensionThreshold: number;
  banThreshold: number;
}

export interface FalsePositiveConfig {
  enableWhitelist: boolean;
  trustedUserThreshold: number;
  appealProcessEnabled: boolean;
  manualReviewRequired: CheatSeverity[];
}

export interface UserBehaviorProfile {
  userId: string;
  createdAt: Date;
  updatedAt: Date;
  
  // Timing Characteristics
  averageMoveTime: number;
  timingVariance: number;
  typicalPausePattern: number[];
  
  // Skill Metrics
  currentSkillLevel: number;
  skillProgression: SkillProgression[];
  specializations: string[];
  
  // Behavioral Patterns
  playStyle: PlayStyle;
  consistencyScore: number;
  improvementRate: number;
  
  // Trust Metrics
  trustScore: number;
  verificationStatus: VerificationStatus;
  flaggedIncidents: number;
  appealHistory: Appeal[];
}

export interface SkillProgression {
  timestamp: Date;
  skillLevel: number;
  puzzlesDifficulty: number;
  averageScore: number;
  context: string;
}

export enum PlayStyle {
  METHODICAL = 'methodical',
  INTUITIVE = 'intuitive',
  AGGRESSIVE = 'aggressive',
  ANALYTICAL = 'analytical',
  EXPERIMENTAL = 'experimental',
}

export enum VerificationStatus {
  UNVERIFIED = 'unverified',
  PENDING = 'pending',
  VERIFIED = 'verified',
  TRUSTED = 'trusted',
  FLAGGED = 'flagged',
  SUSPENDED = 'suspended',
  BANNED = 'banned',
}

export interface Appeal {
  id: string;
  createdAt: Date;
  resolvedAt?: Date;
  status: AppealStatus;
  reason: string;
  evidence: string[];
  reviewerNotes: string;
  outcome: AppealOutcome;
}

export enum AppealStatus {
  PENDING = 'pending',
  UNDER_REVIEW = 'under_review',
  RESOLVED = 'resolved',
}

export enum AppealOutcome {
  UPHELD = 'upheld',
  OVERTURNED = 'overturned',
  PARTIAL = 'partial',
  DISMISSED = 'dismissed',
}
