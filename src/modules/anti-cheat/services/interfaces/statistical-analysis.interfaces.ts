export interface StatisticalAnalysisResult {
  userId: string;
  puzzleId: string;
  analysisTime: Date;
  currentPerformance: PerformanceMetrics;
  historicalComparison: HistoricalComparison;
  populationComparison: BenchmarkComparison;
  outlierDetection: OutlierDetection;
  trendAnalysis: TrendAnalysis;
  anomalyScore: AnomalyScore;
  riskAssessment: RiskAssessment;
  recommendations: string[];
}

export interface PerformanceMetrics {
  score: number;
  time: number;
  accuracy: number;
  efficiency: number;
  moves?: number;
  hintsUsed?: number;
  errorsCount?: number;
}

export interface HistoricalComparison {
  userAverage: number;
  deviation: number;
  percentileRank: number;
  significanceLevel: number;
  trendDirection?: 'improving' | 'declining' | 'stable';
  consistencyScore?: number;
}

export interface BenchmarkComparison {
  populationPercentile: number;
  skillGroupPercentile: number;
  timePercentile: number;
  accuracyPercentile: number;
  overallRanking: number;
}

export interface OutlierDetection {
  isOutlier: boolean;
  outlierType: OutlierType[];
  zScores: {
    score: number;
    time: number;
    accuracy: number;
  };
  confidenceLevel: number;
  comparisonBasis: 'user' | 'population' | 'both';
}

export interface TrendAnalysis {
  trendDirection: 'improving' | 'declining' | 'stable';
  trendStrength: number;
  accelerationRate: number;
  seasonalPatterns: SeasonalPattern[];
  volatility: number;
  predictedNext: PredictionResult | null;
}

export interface AnomalyScore {
  score: number; // 0-1 scale
  severity: 'low' | 'medium' | 'high';
  factors: string[];
  confidence: number;
}

export interface RiskAssessment {
  level: 'low' | 'medium' | 'high' | 'critical';
  factors: string[];
  score: number;
  immediateAction?: boolean;
  monitoringLevel?: 'normal' | 'increased' | 'intensive';
}

export interface SeasonalPattern {
  type: 'daily' | 'weekly' | 'monthly';
  pattern: number[];
  confidence: number;
  description: string;
}

export interface PredictionResult {
  score: number;
  confidence: number;
  range: [number, number];
  timeframe?: string;
}

export type OutlierType = 
  | 'high_score' 
  | 'low_score' 
  | 'fast_time' 
  | 'slow_time' 
  | 'high_accuracy' 
  | 'low_accuracy'
  | 'personal_score_anomaly'
  | 'personal_time_anomaly'
  | 'personal_accuracy_anomaly';

export interface DistributionAnalysis {
  mean: number;
  median: number;
  standardDeviation: number;
  skewness: number;
  kurtosis: number;
  percentiles: {
    p5: number;
    p10: number;
    p25: number;
    p50: number;
    p75: number;
    p90: number;
    p95: number;
    p99: number;
  };
}

export interface CorrelationAnalysis {
  scoreTimeCorrelation: number;
  scoreAccuracyCorrelation: number;
  timeAccuracyCorrelation: number;
  significanceLevel: number;
}

export interface ClusterAnalysis {
  clusterId: number;
  clusterCenter: PerformanceMetrics;
  distanceFromCenter: number;
  clusterSize: number;
  clusterCharacteristics: string[];
}

export interface RegressionAnalysis {
  model: 'linear' | 'polynomial' | 'exponential' | 'logarithmic';
  coefficients: number[];
  rSquared: number;
  standardError: number;
  predictions: PredictionResult[];
}

export interface TimeSeriesAnalysis {
  trend: TrendComponent;
  seasonal: SeasonalComponent;
  residual: ResidualComponent;
  forecastAccuracy: ForecastAccuracy;
}

export interface TrendComponent {
  direction: 'increasing' | 'decreasing' | 'stable';
  slope: number;
  significance: number;
  changePoints: ChangePoint[];
}

export interface SeasonalComponent {
  hasSeasonality: boolean;
  period: number;
  amplitude: number;
  phase: number;
}

export interface ResidualComponent {
  variance: number;
  autocorrelation: number[];
  stationarity: boolean;
  outliers: OutlierPoint[];
}

export interface ForecastAccuracy {
  mape: number; // Mean Absolute Percentage Error
  rmse: number; // Root Mean Square Error
  mae: number;  // Mean Absolute Error
  confidence: number;
}

export interface ChangePoint {
  timestamp: Date;
  significance: number;
  changeType: 'level' | 'trend' | 'variance';
  beforeValue: number;
  afterValue: number;
}

export interface OutlierPoint {
  index: number;
  value: number;
  expectedValue: number;
  deviation: number;
  timestamp: Date;
}

export interface BehavioralFingerprint {
  timingSignature: TimingSignature;
  movementSignature: MovementSignature;
  errorSignature: ErrorSignature;
  learningSignature: LearningSignature;
  consistencySignature: ConsistencySignature;
}

export interface TimingSignature {
  reactionTimeDistribution: DistributionAnalysis;
  thinkingPausePattern: number[];
  rhythmPattern: RhythmPattern;
  fatiguePattern: FatiguePattern;
}

export interface MovementSignature {
  sequencePatterns: SequencePattern[];
  explorationStyle: ExplorationStyle;
  decisionMakingPattern: DecisionPattern;
  correctionPattern: CorrectionPattern;
}

export interface ErrorSignature {
  errorRate: number;
  errorTypes: ErrorTypeDistribution;
  recoverySpeed: number;
  learningFromErrors: boolean;
}

export interface LearningSignature {
  improvementCurve: ImprovementCurve;
  plateauPeriods: PlateauPeriod[];
  breakthroughMoments: BreakthroughMoment[];
  skillTransfer: SkillTransfer;
}

export interface ConsistencySignature {
  performanceVariability: number;
  contextualConsistency: ContextualConsistency;
  temporalConsistency: TemporalConsistency;
  strategicConsistency: StrategicConsistency;
}

export interface RhythmPattern {
  hasNaturalRhythm: boolean;
  dominantFrequency: number;
  rhythmStrength: number;
  variability: number;
}

export interface FatiguePattern {
  showsFatigue: boolean;
  fatigueOnset: number; // minutes
  recoveryPattern: 'immediate' | 'gradual' | 'none';
}

export interface SequencePattern {
  pattern: string;
  frequency: number;
  context: string;
  effectiveness: number;
}

export interface ExplorationStyle {
  type: 'systematic' | 'random' | 'heuristic' | 'mixed';
  breadthVsDepth: number;
  riskTolerance: number;
}

export interface DecisionPattern {
  deliberationTime: number;
  confidenceLevel: number;
  changesMind: boolean;
  decisionQuality: number;
}

export interface CorrectionPattern {
  selfCorrectionRate: number;
  correctionSpeed: number;
  correctionAccuracy: number;
  learnsFromCorrections: boolean;
}

export interface ErrorTypeDistribution {
  conceptualErrors: number;
  executionErrors: number;
  attentionErrors: number;
  speedErrors: number;
}

export interface ImprovementCurve {
  curveType: 'linear' | 'exponential' | 'logarithmic' | 'sigmoid';
  learningRate: number;
  plateauLevel: number;
  asymptote: number;
}

export interface PlateauPeriod {
  startTime: Date;
  duration: number;
  level: number;
  breakoutTrigger?: string;
}

export interface BreakthroughMoment {
  timestamp: Date;
  performanceJump: number;
  context: string;
  sustainability: number;
}

export interface SkillTransfer {
  transfersSkills: boolean;
  transferRate: number;
  transferDirection: 'positive' | 'negative' | 'neutral';
}

export interface ContextualConsistency {
  acrossPuzzleTypes: number;
  acrossDifficulties: number;
  acrossTimeOfDay: number;
  acrossSessionLength: number;
}

export interface TemporalConsistency {
  dayToDay: number;
  withinSession: number;
  acrossSessions: number;
  longTerm: number;
}

export interface StrategicConsistency {
  approachConsistency: number;
  adaptability: number;
  strategicFlexibility: number;
}

export interface ComparativeAnalysis {
  peerComparison: PeerComparison;
  expertComparison: ExpertComparison;
  noviceComparison: NoviceComparison;
  botComparison: BotComparison;
}

export interface PeerComparison {
  similarityScore: number;
  rankingPosition: number;
  strengthsVsPeers: string[];
  weaknessesVsPeers: string[];
}

export interface ExpertComparison {
  expertLikeness: number;
  expertTraits: string[];
  missingExpertTraits: string[];
  expertiseLevel: number;
}

export interface NoviceComparison {
  noviceLikeness: number;
  noviceTraits: string[];
  maturityLevel: number;
}

export interface BotComparison {
  botLikelihood: number;
  botTraits: string[];
  humanTraits: string[];
  suspiciousPatterns: string[];
}

export interface ModelPredictions {
  cheatProbability: number;
  skillLevel: number;
  nextPerformance: PerformanceMetrics;
  riskScore: number;
  recommendedActions: RecommendedAction[];
}

export interface RecommendedAction {
  action: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  confidence: number;
  timeframe: string;
  expectedOutcome: string;
}
