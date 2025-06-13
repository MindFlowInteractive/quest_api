import { CheatDetectionResult, CheatSeverity } from './anti-cheat.interfaces';

export interface ManualReviewCase {
  caseId: string;
  userId: string;
  puzzleId: string;
  sessionId: string;
  detectionResult: CheatDetectionResult;
  evidencePackage: EvidencePackage;
  status: ReviewStatus;
  priority: ReviewPriority;
  assignedReviewer?: string;
  assignedAt?: Date;
  reviewStarted?: Date;
  reviewCompleted?: Date;
  createdAt: Date;
  expectedCompleteBy: Date;
  workflow: ReviewWorkflow;
  assignmentHistory: ReviewerAssignment[];
  reviewHistory: ReviewHistoryEntry[];
  escalation?: EscalationInfo;
  appeal?: AppealInfo;
  finalDecision?: ReviewDecision;
  additionalReviewReason?: string;
  tags?: string[];
  relatedCases?: string[];
}

export interface ReviewDecision {
  verdict: ReviewVerdict;
  confidence: number;
  reasoning: string;
  evidence: string[];
  recommendedAction?: RecommendedAction[];
  banDuration?: string;
  invalidationScope?: InvalidationScope;
  followUpRequired?: boolean;
  reviewerNotes?: string;
  timeSpent: number;
}

export interface ReviewerAssignment {
  reviewerId: string;
  assignedBy: string;
  assignedAt: Date;
  notified: boolean;
  acceptedAt?: Date;
  role: ReviewerRole;
  expertise?: string[];
}

export interface ReviewAnalysis {
  caseId: string;
  generatedAt: Date;
  evidenceSummary: EvidenceSummary;
  riskFactors: string[];
  mitigatingFactors: string[];
  similarCases: SimilarCase[];
  expertOpinions: ExpertOpinion[];
  recommendedDecision: string;
  confidenceLevel: number;
  additionalInvestigation: string[];
  aiAssistance?: AIAssistance;
  patternMatches?: PatternMatch[];
}

export interface EvidencePackage {
  detectionData: CheatDetectionResult;
  userProfile: UserProfile;
  sessionData: SessionData;
  historicalData: HistoricalData;
  comparativeData: ComparativeData;
  technicalEvidence: TechnicalEvidence;
  behavioralEvidence: BehavioralEvidence;
  contextualFactors: ContextualFactors;
  generatedAt: Date;
  analysisVersion: string;
}

export interface ReviewWorkflow {
  steps: WorkflowStep[];
  currentStep: number;
  requiresMultipleReviewers: boolean;
  requiresExpertReview: boolean;
  autoEscalationEnabled: boolean;
  escalationTimeoutHours: number;
}

export interface ReviewMetrics {
  reviewerId: string;
  period: DateRange;
  totalCasesReviewed: number;
  averageTimePerCase: number;
  accuracyRate: number;
  overturns: number;
  escalations: number;
  specializations: string[];
  performanceRating: number;
}

export interface EvidenceSummary {
  keyFindings: KeyFinding[];
  strengths: string[];
  weaknesses: string[];
  inconsistencies: string[];
  missingEvidence: string[];
  evidenceQuality: EvidenceQuality;
}

export interface SimilarCase {
  caseId: string;
  similarity: number;
  outcome: ReviewVerdict;
  keyDifferences: string[];
  lessons: string[];
}

export interface ExpertOpinion {
  expertId: string;
  expertise: string[];
  opinion: string;
  confidence: number;
  reasoning: string[];
  providedAt: Date;
}

export interface AIAssistance {
  recommendation: ReviewVerdict;
  confidence: number;
  reasoning: string[];
  modelVersion: string;
  features: AIFeature[];
  explainability: ExplainabilityData;
}

export interface PatternMatch {
  patternType: string;
  matchStrength: number;
  description: string;
  historicalOccurrences: number;
  typicalOutcome: ReviewVerdict;
}

export interface UserProfile {
  id: string;
  createdAt: Date;
  totalPuzzlesSolved: number;
  averageScore: number;
  skillLevel: number;
  reputationScore: number;
  previousFlags: PreviousFlag[];
  accountStatus: AccountStatus;
  verificationLevel: VerificationLevel;
  deviceHistory: DeviceInfo[];
  locationHistory: LocationInfo[];
  playPatterns: PlayPattern[];
}

export interface SessionData {
  id: string;
  userId: string;
  startTime: Date;
  endTime: Date;
  duration: number;
  puzzlesSolved: number;
  deviceInfo: DeviceInfo;
  networkInfo: NetworkInfo;
  userAgent: string;
  ipAddress: string;
  geolocation?: Geolocation;
  performanceMetrics: SessionPerformanceMetrics;
}

export interface HistoricalData {
  totalSessions: number;
  averagePerformance: PerformanceMetrics;
  performanceTrends: TrendData[];
  flagHistory: FlagHistoryEntry[];
  behaviorBaseline: BehaviorBaseline;
  skillProgression: SkillProgression;
  consistencyMetrics: ConsistencyMetrics;
}

export interface ComparativeData {
  peerComparison: PeerComparison;
  populationComparison: PopulationComparison;
  expertComparison: ExpertComparison;
  noviceComparison: NoviceComparison;
  botComparison: BotComparison;
  timeBasedComparison: TimeBasedComparison;
}

export interface TechnicalEvidence {
  inputPatterns: InputPattern[];
  systemMetrics: SystemMetrics;
  networkAnalysis: NetworkAnalysis;
  environmentalFactors: EnvironmentalFactors;
  automationIndicators: AutomationIndicator[];
  memoryAnalysis?: MemoryAnalysis;
  processAnalysis?: ProcessAnalysis;
}

export interface BehavioralEvidence {
  timingPatterns: TimingPattern[];
  movementPatterns: MovementPattern[];
  decisionPatterns: DecisionPattern[];
  errorPatterns: ErrorPattern[];
  learningPatterns: LearningPattern[];
  fatigueIndicators: FatigueIndicator[];
  attentionPatterns: AttentionPattern[];
}

export interface ContextualFactors {
  timeOfDay: number;
  dayOfWeek: number;
  platformUsed: string;
  networkConditions: string;
  devicePerformance: string;
  distractionLevel: string;
  competitiveContext?: string;
  rewardContext?: string;
  socialContext?: string;
}

export interface WorkflowStep {
  name: string;
  description: string;
  requiredRole: ReviewerRole;
  timeLimit: number; // hours
  completed: boolean;
  completedBy?: string;
  completedAt?: Date;
  result?: string;
  notes?: string;
}

export interface EscalationInfo {
  escalatedBy: string;
  escalatedAt: Date;
  reason: string;
  targetLevel: EscalationLevel;
  previousReviewer?: string;
  urgency: 'normal' | 'high' | 'critical';
  additionalContext?: string;
}

export interface AppealInfo {
  appealedBy: string;
  appealedAt: Date;
  reason: string;
  evidence: string[];
  status: AppealStatus;
  reviewedBy?: string;
  reviewedAt?: Date;
  outcome?: AppealOutcome;
  newEvidence?: boolean;
}

export interface ReviewHistoryEntry {
  reviewerId: string;
  decision: ReviewDecision;
  submittedAt: Date;
  timeSpent: number;
  role: ReviewerRole;
  overturned?: boolean;
  overturnReason?: string;
}

export interface KeyFinding {
  type: 'evidence' | 'red_flag' | 'mitigating' | 'neutral';
  description: string;
  importance: 'low' | 'medium' | 'high' | 'critical';
  confidence: number;
  source: string;
  relatedEvidence?: string[];
}

export interface EvidenceQuality {
  completeness: number;
  reliability: number;
  consistency: number;
  objectivity: number;
  timeliness: number;
  overall: number;
}

export interface AIFeature {
  name: string;
  value: number;
  importance: number;
  description: string;
}

export interface ExplainabilityData {
  topFeatures: AIFeature[];
  decisionPath: DecisionNode[];
  alternatives: AlternativeExplanation[];
  confidence: number;
}

export interface DecisionNode {
  feature: string;
  threshold: number;
  direction: 'left' | 'right';
  samples: number;
  confidence: number;
}

export interface AlternativeExplanation {
  verdict: ReviewVerdict;
  probability: number;
  reasoning: string[];
}

export interface PreviousFlag {
  flagType: string;
  flaggedAt: Date;
  severity: string;
  resolved: boolean;
  outcome?: string;
}

export interface DeviceInfo {
  type: 'desktop' | 'mobile' | 'tablet';
  os: string;
  browser: string;
  screenResolution: string;
  deviceFingerprint: string;
  hardwareSpecs?: HardwareSpecs;
}

export interface NetworkInfo {
  ipAddress: string;
  isp: string;
  vpnDetected: boolean;
  proxyDetected: boolean;
  connectionType: string;
  latency: number;
  bandwidth: number;
}

export interface Geolocation {
  country: string;
  region: string;
  city: string;
  latitude: number;
  longitude: number;
  accuracy: number;
}

export interface SessionPerformanceMetrics {
  puzzlesSolved: number;
  averageTime: number;
  averageScore: number;
  errorRate: number;
  hintUsage: number;
  breaksTaken: number;
}

export interface PerformanceMetrics {
  score: number;
  time: number;
  accuracy: number;
  efficiency: number;
}

export interface TrendData {
  metric: string;
  values: number[];
  timestamps: Date[];
  trend: 'increasing' | 'decreasing' | 'stable';
  significance: number;
}

export interface FlagHistoryEntry {
  flagType: string;
  flaggedAt: Date;
  confidence: number;
  resolved: boolean;
  outcome: string;
  reviewer?: string;
}

export interface BehaviorBaseline {
  typicalPerformance: PerformanceMetrics;
  timingCharacteristics: TimingCharacteristics;
  movementCharacteristics: MovementCharacteristics;
  errorCharacteristics: ErrorCharacteristics;
  learningCharacteristics: LearningCharacteristics;
}

export interface SkillProgression {
  initialSkill: number;
  currentSkill: number;
  progressionRate: number;
  plateauPeriods: PlateauPeriod[];
  breakthroughs: Breakthrough[];
}

export interface ConsistencyMetrics {
  performanceVariability: number;
  timingConsistency: number;
  strategyConsistency: number;
  environmentalConsistency: number;
}

export interface PeerComparison {
  similarityToTypicalUser: number;
  percentileRanking: number;
  standoutMetrics: string[];
}

export interface PopulationComparison {
  populationPercentile: number;
  deviationFromNorm: number;
  unusualPatterns: string[];
}

export interface ExpertComparison {
  expertLikeness: number;
  expertTraits: string[];
  missingExpertTraits: string[];
}

export interface NoviceComparison {
  noviceLikeness: number;
  developmentalStage: string;
  typicalNoviceTraits: string[];
}

export interface BotComparison {
  botLikelihood: number;
  botTraits: string[];
  humanTraits: string[];
  distinguishingFeatures: string[];
}

export interface TimeBasedComparison {
  hourlyPerformance: number[];
  dailyPerformance: number[];
  weeklyPatterns: WeeklyPattern[];
  seasonalPatterns: SeasonalPattern[];
}

export interface InputPattern {
  type: 'mouse' | 'keyboard' | 'touch';
  frequency: number;
  precision: number;
  consistency: number;
  humanLikelihood: number;
  suspiciousCharacteristics: string[];
}

export interface SystemMetrics {
  cpuUsage: number[];
  memoryUsage: number[];
  diskUsage: number[];
  networkUsage: number[];
  suspiciousProcesses: string[];
  performanceAnomalies: string[];
}

export interface NetworkAnalysis {
  latencyPattern: number[];
  packetLoss: number[];
  jitter: number[];
  suspiciousTraffic: boolean;
  vpnDetection: VPNDetection;
  proxyDetection: ProxyDetection;
}

export interface EnvironmentalFactors {
  browserInfo: BrowserInfo;
  systemInfo: SystemInfo;
  locationInfo: LocationInfo;
  deviceFingerprint: DeviceFingerprint;
  timeZoneInfo: TimeZoneInfo;
}

export interface AutomationIndicator {
  type: string;
  confidence: number;
  description: string;
  evidence: string[];
}

export interface MemoryAnalysis {
  memoryModifications: boolean;
  suspiciousAllocations: number;
  unexpectedPatterns: string[];
}

export interface ProcessAnalysis {
  runningProcesses: string[];
  suspiciousProcesses: string[];
  processInteractions: ProcessInteraction[];
}

export interface TimingPattern {
  type: string;
  pattern: number[];
  consistency: number;
  humanLikelihood: number;
  anomalies: TimingAnomaly[];
}

export interface MovementPattern {
  type: string;
  efficiency: number;
  naturalness: number;
  repetitiveness: number;
  optimization: number;
}

export interface DecisionPattern {
  deliberationTime: number;
  confidenceLevel: number;
  changeFrequency: number;
  qualityScore: number;
}

export interface ErrorPattern {
  errorTypes: string[];
  frequency: number;
  recoverySpeed: number;
  learningRate: number;
}

export interface LearningPattern {
  adaptationRate: number;
  knowledgeRetention: number;
  skillTransfer: number;
  improvementConsistency: number;
}

export interface FatigueIndicator {
  type: string;
  onset: number;
  severity: number;
  duration: number;
  recovery: number;
}

export interface AttentionPattern {
  focusDuration: number;
  distractionFrequency: number;
  taskSwitching: number;
  vigilanceDecrement: number;
}

export interface HardwareSpecs {
  cpu: string;
  memory: string;
  graphics: string;
  storage: string;
}

export interface TimingCharacteristics {
  averageReactionTime: number;
  reactionTimeVariability: number;
  thinkingTime: number;
  rhythmPattern: string;
}

export interface MovementCharacteristics {
  movementStyle: string;
  efficiency: number;
  explorationPattern: string;
  optimizationLevel: number;
}

export interface ErrorCharacteristics {
  errorRate: number;
  errorTypes: string[];
  recoveryPattern: string;
  learningFromErrors: boolean;
}

export interface LearningCharacteristics {
  learningSpeed: number;
  adaptability: number;
  knowledgeRetention: number;
  skillTransfer: number;
}

export interface PlateauPeriod {
  startDate: Date;
  endDate: Date;
  skillLevel: number;
  duration: number;
}

export interface Breakthrough {
  date: Date;
  previousLevel: number;
  newLevel: number;
  trigger?: string;
}

export interface WeeklyPattern {
  dayOfWeek: number;
  performance: number;
  activity: number;
  consistency: number;
}

export interface SeasonalPattern {
  period: string;
  amplitude: number;
  phase: number;
  significance: number;
}

export interface VPNDetection {
  detected: boolean;
  provider?: string;
  confidence: number;
  indicators: string[];
}

export interface ProxyDetection {
  detected: boolean;
  type?: string;
  confidence: number;
  indicators: string[];
}

export interface BrowserInfo {
  name: string;
  version: string;
  userAgent: string;
  features: string[];
  plugins: string[];
}

export interface SystemInfo {
  os: string;
  architecture: string;
  language: string;
  timezone: string;
  screenInfo: ScreenInfo;
}

export interface LocationInfo {
  country: string;
  region: string;
  city: string;
  isp: string;
  autonomous_system: string;
}

export interface DeviceFingerprint {
  hash: string;
  components: FingerprintComponent[];
  uniqueness: number;
  stability: number;
}

export interface TimeZoneInfo {
  timezone: string;
  offset: number;
  dst: boolean;
  consistency: boolean;
}

export interface ProcessInteraction {
  sourceProcess: string;
  targetProcess: string;
  interactionType: string;
  frequency: number;
}

export interface TimingAnomaly {
  type: string;
  timestamp: Date;
  expectedValue: number;
  actualValue: number;
  deviation: number;
}

export interface ScreenInfo {
  width: number;
  height: number;
  colorDepth: number;
  pixelRatio: number;
}

export interface FingerprintComponent {
  name: string;
  value: string;
  entropy: number;
  stability: number;
}

export interface DateRange {
  startDate: Date;
  endDate: Date;
}

export interface PlayPattern {
  sessionDuration: number;
  frequency: number;
  timeOfDay: number;
  dayOfWeek: number;
  intensity: number;
}

export type ReviewStatus = 
  | 'pending' 
  | 'assigned' 
  | 'in_review' 
  | 'pending_additional_review'
  | 'completed' 
  | 'escalated' 
  | 'appealed'
  | 'archived';

export type ReviewPriority = 'low' | 'medium' | 'high' | 'urgent';

export type ReviewVerdict = 
  | 'legitimate' 
  | 'suspicious' 
  | 'confirmed_cheat' 
  | 'inconclusive';

export type ReviewerRole = 
  | 'reviewer' 
  | 'senior_reviewer' 
  | 'expert_reviewer' 
  | 'admin';

export type EscalationLevel = 'senior' | 'expert' | 'admin';

export type AppealStatus = 
  | 'pending' 
  | 'under_review' 
  | 'approved' 
  | 'rejected' 
  | 'withdrawn';

export type AppealOutcome = 
  | 'overturned' 
  | 'upheld' 
  | 'modified' 
  | 'dismissed';

export type AccountStatus = 
  | 'active' 
  | 'suspended' 
  | 'banned' 
  | 'under_review' 
  | 'restricted';

export type VerificationLevel = 
  | 'unverified' 
  | 'email_verified' 
  | 'phone_verified' 
  | 'identity_verified';

export type RecommendedAction = 
  | 'no_action' 
  | 'warning' 
  | 'temporary_ban' 
  | 'permanent_ban' 
  | 'increased_monitoring' 
  | 'skill_verification' 
  | 'device_verification';

export type InvalidationScope = 
  | 'session' 
  | 'day' 
  | 'week' 
  | 'month' 
  | 'all_time' 
  | 'specific_puzzles';
