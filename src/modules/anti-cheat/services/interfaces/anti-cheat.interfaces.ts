export interface SolutionValidationResult {
  isValid: boolean;
  isLegitimate: boolean;
  cheatFlags: AntiCheatFlags[];
  confidence: number;
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
  flags: AntiCheatFlags[];
  severity: CheatSeverity;
  confidence: number;
  evidence: CheatEvidence;
  status: CheatStatus;
}

export interface TimingAnalysis {
  averageTime: number;
  variance: number;
  suspiciousIntervals: number[];
  flags: AntiCheatFlags[];
  humanLikelihood: number;
  statisticalProfile: TimingProfile;
  anomalyScore: number;
}

export interface TimingProfile {
  median: number;
  quartiles: [number, number, number];
  outliers: number[];
  distributionType: 'normal' | 'log-normal' | 'uniform' | 'suspicious';
  rhythmPattern: RhythmPattern;
}

export interface RhythmPattern {
  hasNaturalRhythm: boolean;
  consistencyScore: number;
  typingBurstPatterns: boolean;
  thinkingPauses: number[];
}

export interface MovementPattern {
  efficiency: number;
  optimality: number;
  repetitiveness: number;
  flags: AntiCheatFlags[];
  patternSignature: string;
  solutionPath: SolutionPath;
  strategicAnalysis: StrategicAnalysis;
}

export interface SolutionPath {
  isOptimal: boolean;
  deviationFromOptimal: number;
  alternativePaths: number;
  backtrackingFrequency: number;
  explorationPattern: ExplorationPattern;
}

export interface ExplorationPattern {
  searchDepth: number;
  branchingFactor: number;
  pruningEfficiency: number;
  heuristicUsage: HeuristicUsage;
}

export interface HeuristicUsage {
  type: 'human' | 'algorithmic' | 'hybrid' | 'unknown';
  consistency: number;
  sophistication: number;
  knownPatterns: string[];
}

export interface StrategicAnalysis {
  planningDepth: number;
  adaptability: number;
  errorRecovery: ErrorRecoveryPattern;
  learningCurve: LearningCurveAnalysis;
}

export interface ErrorRecoveryPattern {
  errorRate: number;
  recoverySpeed: number;
  recoveryStrategy: 'immediate' | 'backtrack' | 'restart' | 'systematic';
  humanLike: boolean;
}

export interface LearningCurveAnalysis {
  improvementRate: number;
  plateauPeriods: number;
  skillTransfer: boolean;
  naturalProgression: boolean;
}

export interface BehaviorProfile {
  consistencyScore: number;
  skillProgression: number;
  typicalBehavior: boolean;
  flags: AntiCheatFlags[];
  sessionPattern: SessionPattern;
  cognitiveMarkers: CognitiveMarkers;
}

export interface SessionPattern {
  duration: number;
  intensity: number;
  breaks: number[];
  fatigueSigns: boolean;
  naturalFlow: boolean;
}

export interface CognitiveMarkers {
  attentionPattern: AttentionPattern;
  decisionMaking: DecisionMakingPattern;
  memoryUsage: MemoryUsagePattern;
  metacognition: MetacognitionPattern;
}

export interface AttentionPattern {
  focusDuration: number;
  distractionEvents: number;
  taskSwitching: number;
  sustainedAttention: boolean;
}

export interface DecisionMakingPattern {
  deliberationTime: number;
  impulsiveDecisions: number;
  riskTaking: number;
  uncertaintyHandling: 'confident' | 'hesitant' | 'systematic';
}

export interface MemoryUsagePattern {
  shortTermLoad: number;
  workingMemoryStrain: boolean;
  patternRecognition: number;
  knowledgeApplication: 'novice' | 'intermediate' | 'expert' | 'superhuman';
}

export interface MetacognitionPattern {
  selfMonitoring: boolean;
  strategyAdjustment: number;
  confidenceCalibration: number;
  reflectiveThinking: boolean;
}

export interface ValidationMetrics {
  totalValidations: number;
  flaggedAttempts: number;
  falsePositiveRate: number;
  falseNegativeRate: number;
  averageConfidence: number;
}

export interface AnomalyDetection {
  statisticalAnomaly: boolean;
  behavioralAnomaly: boolean;
  temporalAnomaly: boolean;
  patternAnomaly: boolean;
  severity: AnomalySeverity;
}

export interface CheatEvidence {
  timingEvidence: TimingEvidence;
  movementEvidence: MovementEvidence;
  behaviorEvidence: BehaviorEvidence;
  technicalEvidence: TechnicalEvidence;
}

export interface TimingEvidence {
  superhumanIntervals: number[];
  impossibleConsistency: number;
  suspiciousPatterns: string[];
  comparisonData: HistoricalComparison;
}

export interface MovementEvidence {
  perfectMoves: number[];
  repetitivePatterns: string[];
  impossibleOptimization: number;
  knownBotSignatures: string[];
}

export interface BehaviorEvidence {
  skillJumps: SkillJump[];
  inconsistentPerformance: PerformanceInconsistency[];
  unnaturalPatterns: UnnaturalPattern[];
  missingHumanTraits: string[];
}

export interface TechnicalEvidence {
  inputPatterns: InputPattern[];
  systemMetrics: SystemMetrics;
  networkAnalysis: NetworkAnalysis;
  environmentalFactors: EnvironmentalFactors;
}

export interface SkillJump {
  fromLevel: number;
  toLevel: number;
  timeframe: number;
  likelihood: number;
}

export interface PerformanceInconsistency {
  metric: string;
  variance: number;
  expectedRange: [number, number];
  actualValue: number;
}

export interface UnnaturalPattern {
  type: string;
  description: string;
  confidence: number;
  examples: string[];
}

export interface InputPattern {
  type: 'mouse' | 'keyboard' | 'touch' | 'gamepad';
  frequency: number;
  precision: number;
  humanLikelihood: number;
}

export interface SystemMetrics {
  cpuUsage: number[];
  memoryUsage: number[];
  networkLatency: number[];
  suspiciousProcesses: string[];
}

export interface NetworkAnalysis {
  latencyPattern: number[];
  packetTiming: number[];
  suspiciousTraffic: boolean;
  vpnDetection: boolean;
}

export interface EnvironmentalFactors {
  browserInfo: BrowserInfo;
  systemInfo: SystemInfo;
  locationInfo: LocationInfo;
  deviceFingerprint: DeviceFingerprint;
}

export interface BrowserInfo {
  userAgent: string;
  viewport: { width: number; height: number };
  timezone: string;
  language: string;
  plugins: string[];
}

export interface SystemInfo {
  platform: string;
  cpuCores: number;
  memoryGB: number;
  screenResolution: string;
  colorDepth: number;
}

export interface LocationInfo {
  country: string;
  region: string;
  city: string;
  isp: string;
  suspicious: boolean;
}

export interface DeviceFingerprint {
  hash: string;
  confidence: number;
  uniqueness: number;
  riskScore: number;
}

export interface HistoricalComparison {
  userAverage: number;
  globalAverage: number;
  percentile: number;
  deviation: number;
}

export enum AntiCheatFlags {
  // State validation flags
  INVALID_STATE_TRANSITION = 'invalid_state_transition',
  IMPOSSIBLE_MOVE = 'impossible_move',
  STATE_MANIPULATION = 'state_manipulation',
  
  // Timing flags
  SUPERHUMAN_TIMING = 'superhuman_timing',
  INHUMAN_CONSISTENCY = 'inhuman_consistency',
  TIMING_ANOMALY = 'timing_anomaly',
  IMPOSSIBLE_SPEED = 'impossible_speed',
  MISSING_TIMING_DATA = 'missing_timing_data',
  
  // Movement pattern flags
  PERFECT_SOLUTION = 'perfect_solution',
  TOO_OPTIMAL = 'too_optimal',
  REPETITIVE_PATTERNS = 'repetitive_patterns',
  BOT_SIGNATURE = 'bot_signature',
  KNOWN_SOLVER_PATTERN = 'known_solver_pattern',
  
  // Behavioral flags
  IMPOSSIBLE_IMPROVEMENT = 'impossible_improvement',
  ATYPICAL_BEHAVIOR = 'atypical_behavior',
  MISSING_HUMAN_TRAITS = 'missing_human_traits',
  INCONSISTENT_SKILL = 'inconsistent_skill',
  UNNATURAL_LEARNING = 'unnatural_learning',
  
  // Technical flags
  SUSPICIOUS_INPUT = 'suspicious_input',
  AUTOMATION_DETECTED = 'automation_detected',
  SCRIPT_INJECTION = 'script_injection',
  MEMORY_MANIPULATION = 'memory_manipulation',
  NETWORK_ANOMALY = 'network_anomaly',
  
  // System flags
  VALIDATION_ERROR = 'validation_error',
  EMPTY_MOVE_SEQUENCE = 'empty_move_sequence',
  CORRUPTED_DATA = 'corrupted_data',
  SYSTEM_MANIPULATION = 'system_manipulation',
}

export enum CheatSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export enum CheatStatus {
  DETECTED = 'detected',
  UNDER_REVIEW = 'under_review',
  CONFIRMED = 'confirmed',
  FALSE_POSITIVE = 'false_positive',
  RESOLVED = 'resolved',
  APPEALED = 'appealed',
}

export enum AnomalySeverity {
  MINOR = 'minor',
  MODERATE = 'moderate',
  SEVERE = 'severe',
  EXTREME = 'extreme',
}

export interface CheatDetectionConfig {
  enabledModules: CheatDetectionModule[];
  thresholds: DetectionThresholds;
  sampling: SamplingConfig;
  reporting: ReportingConfig;
}

export enum CheatDetectionModule {
  TIMING_ANALYSIS = 'timing_analysis',
  MOVEMENT_PATTERNS = 'movement_patterns',
  BEHAVIOR_PROFILING = 'behavior_profiling',
  STATISTICAL_ANALYSIS = 'statistical_analysis',
  SOLUTION_VERIFICATION = 'solution_verification',
  INPUT_MONITORING = 'input_monitoring',
  SYSTEM_MONITORING = 'system_monitoring',
}

export interface DetectionThresholds {
  timingThresholds: TimingThresholds;
  behaviorThresholds: BehaviorThresholds;
  confidenceThresholds: ConfidenceThresholds;
}

export interface TimingThresholds {
  minMoveTime: number;
  maxMoveTime: number;
  superhumanThreshold: number;
  consistencyThreshold: number;
  anomalyThreshold: number;
}

export interface BehaviorThresholds {
  accuracyThreshold: number;
  optimalityThreshold: number;
  improvementThreshold: number;
  consistencyThreshold: number;
}

export interface ConfidenceThresholds {
  flagThreshold: number;
  reviewThreshold: number;
  actionThreshold: number;
  banThreshold: number;
}

export interface SamplingConfig {
  sampleRate: number;
  intensiveMonitoring: boolean;
  targetedSampling: boolean;
  adaptiveSampling: boolean;
}

export interface ReportingConfig {
  realTimeAlerts: boolean;
  dailyReports: boolean;
  weeklyAnalysis: boolean;
  customReports: boolean;
  alertChannels: AlertChannel[];
}

export enum AlertChannel {
  EMAIL = 'email',
  SLACK = 'slack',
  WEBHOOK = 'webhook',
  DATABASE = 'database',
  LOG = 'log',
}
