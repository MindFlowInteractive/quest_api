import { ReviewDecision } from './manual-review.interfaces';

export interface Appeal {
  reason: string;
  evidence: AppealEvidence;
  originalDecision: ReviewDecision;
  urgencyLevel: 'normal' | 'high' | 'urgent';
  requestedOutcome: 'overturn' | 'reduce_penalty' | 'clarification';
  additionalContext?: string;
  supportingDocuments?: string[];
  witnessStatements?: WitnessStatement[];
}

export interface AppealEvidence {
  evidenceType: EvidenceType;
  description: string;
  documentation: string[];
  witnesses: string[];
  expertOpinion?: ExpertOpinion;
  technicalData?: TechnicalData;
  contextualInformation?: ContextualInformation;
  newFactors?: NewFactor[];
  confidence: number;
  relevanceScore: number;
  isNew: boolean;
  verifiedSources: boolean;
  independentVerification: boolean;
  potentialImpact: 'low' | 'medium' | 'high';
  submissionDate: Date;
}

export interface AppealDecision {
  outcome: AppealOutcome;
  reasoning: string;
  confidence: number;
  reviewerId: string;
  reviewedAt: Date;
  newPenalty?: ModifiedPenalty | null;
  compensationOffered: boolean;
  followUpRequired: boolean;
  precedentSet?: boolean;
  lessonsLearned?: string[];
  appealerNotified?: boolean;
  executionDate?: Date;
  reviewTime?: number;
}

export interface AppealReview {
  reviewerId: string;
  startTime: Date;
  evidenceAssessment: EvidenceAssessment;
  originalDecisionAnalysis: OriginalDecisionAnalysis;
  biasAssessment: BiasAssessment;
  proceduralReview: ProceduralReview;
  precedentAnalysis: PrecedentAnalysis;
  recommendation: ReviewRecommendation;
  confidenceLevel: number;
  timeSpent: number;
  notes: string;
}

export interface AppealMetrics {
  period: DatePeriod;
  totalAppeals: number;
  approvalRate: number;
  modificationRate: number;
  rejectionRate: number;
  averageReviewTime: number;
  appealsByType: { [key in EvidenceType]: number };
  outcomesByOriginalSeverity: OutcomeBySeverity[];
  reviewerPerformance: ReviewerPerformance[];
  compensationOffered: number;
  falsePositiveRate: number;
  userSatisfaction: number;
  systemImprovements: SystemImprovement[];
}

export interface AppealValidation {
  isEligible: boolean;
  eligibilityReasons: string[];
  appealWindow: AppealWindow;
  userAppealHistory: UserAppealHistory;
  caseQualifications: CaseQualification[];
  requiredEvidence: RequiredEvidence[];
  estimatedOutcome: EstimatedOutcome;
  recommendations: string[];
}

export interface WitnessStatement {
  witnessId: string;
  witnessType: 'user' | 'expert' | 'moderator' | 'technical';
  statement: string;
  credibility: number;
  relevance: number;
  verificationStatus: 'unverified' | 'pending' | 'verified' | 'disputed';
  contactInformation?: string;
  submittedAt: Date;
}

export interface ExpertOpinion {
  expertId: string;
  credentials: string[];
  specialization: string[];
  opinion: string;
  methodology: string;
  confidence: number;
  supportingData: string[];
  conflictOfInterest: boolean;
  professionalReference: string;
  submittedAt: Date;
}

export interface TechnicalData {
  dataType: 'logs' | 'screenshots' | 'videos' | 'system_info' | 'network_data';
  description: string;
  files: TechnicalFile[];
  analysisRequired: boolean;
  verificationMethod: string;
  authenticity: number;
  relevance: number;
}

export interface ContextualInformation {
  timeframe: string;
  circumstances: string;
  environmentalFactors: string[];
  personalFactors: string[];
  externalFactors: string[];
  timeline: TimelineEvent[];
  impactAssessment: string;
}

export interface NewFactor {
  factorType: string;
  description: string;
  impact: 'minor' | 'moderate' | 'significant' | 'major';
  verifiable: boolean;
  sourceReliability: number;
  timeRelevance: number;
}

export interface ModifiedPenalty {
  type: 'warning' | 'temporary_restriction' | 'reduced_ban' | 'community_service' | 'probation';
  duration?: string;
  conditions: string[];
  restrictions: string[];
  reviewPeriod?: string;
  escalationConditions?: string[];
}

export interface EvidenceAssessment {
  strength: number;
  credibility: number;
  relevance: number;
  novelty: number;
  verifiability: number;
  consistency: number;
  completeness: number;
  qualityScore: number;
  gaps: string[];
  strengths: string[];
  weaknesses: string[];
}

export interface OriginalDecisionAnalysis {
  confidence: number;
  evidenceQuality: number;
  procedureCompliance: number;
  biasIndicators: string[];
  timeSpent: number;
  thoroughness: number;
  consistency: number;
  appealableAspects: string[];
}

export interface BiasAssessment {
  biasDetected: boolean;
  biasTypes: BiasType[];
  confidence: number;
  evidence: string[];
  impact: 'negligible' | 'minor' | 'moderate' | 'significant';
  mitigation: string[];
}

export interface ProceduralReview {
  procedureFollowed: boolean;
  violations: ProceduralViolation[];
  severity: 'minor' | 'moderate' | 'major' | 'critical';
  correctiveActions: string[];
  systemicIssues: string[];
}

export interface PrecedentAnalysis {
  similarCases: SimilarCase[];
  precedentExists: boolean;
  consistency: number;
  newPrecedent: boolean;
  implications: string[];
}

export interface ReviewRecommendation {
  outcome: AppealOutcome;
  reasoning: string[];
  confidence: number;
  alternativeOptions: AlternativeOption[];
  riskAssessment: RiskAssessment;
  implementationSteps: string[];
}

export interface DatePeriod {
  startDate: Date;
  endDate: Date;
  periodType: 'day' | 'week' | 'month' | 'quarter' | 'year';
}

export interface OutcomeBySeverity {
  originalSeverity: string;
  outcomes: { [key in AppealOutcome]: number };
  averageReviewTime: number;
  successRate: number;
}

export interface ReviewerPerformance {
  reviewerId: string;
  appealCount: number;
  averageTime: number;
  overturnRate: number;
  consistency: number;
  biasScore: number;
  userSatisfaction: number;
  specializations: string[];
}

export interface SystemImprovement {
  improvementType: string;
  description: string;
  implementedAt: Date;
  impact: string;
  metrics: { [key: string]: number };
}

export interface AppealWindow {
  deadlineDate: Date;
  timeRemaining: number;
  extensionPossible: boolean;
  extensionCriteria: string[];
}

export interface UserAppealHistory {
  totalAppeals: number;
  successfulAppeals: number;
  pendingAppeals: number;
  lastAppealDate?: Date;
  appealLimit: number;
  remainingAppeals: number;
  appealPatterns: string[];
}

export interface CaseQualification {
  criterion: string;
  met: boolean;
  description: string;
  impact: 'positive' | 'negative' | 'neutral';
}

export interface RequiredEvidence {
  evidenceType: EvidenceType;
  required: boolean;
  description: string;
  acceptableFormats: string[];
  qualityStandards: string[];
}

export interface EstimatedOutcome {
  likelyOutcome: AppealOutcome;
  probability: number;
  factors: string[];
  uncertainties: string[];
  timeframe: string;
}

export interface TechnicalFile {
  filename: string;
  fileType: string;
  size: number;
  hash: string;
  uploadDate: Date;
  verified: boolean;
  analysisResults?: string;
}

export interface TimelineEvent {
  timestamp: Date;
  event: string;
  significance: 'low' | 'medium' | 'high';
  verified: boolean;
  source: string;
}

export interface ProceduralViolation {
  violationType: string;
  description: string;
  severity: 'minor' | 'moderate' | 'major' | 'critical';
  impact: string;
  correctiveAction: string;
}

export interface SimilarCase {
  caseId: string;
  similarity: number;
  outcome: AppealOutcome;
  circumstances: string[];
  precedentValue: number;
  lessons: string[];
}

export interface AlternativeOption {
  option: string;
  description: string;
  pros: string[];
  cons: string[];
  feasibility: number;
  impact: string;
}

export interface RiskAssessment {
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  riskFactors: string[];
  mitigationStrategies: string[];
  monitoringRequired: boolean;
  escalationTriggers: string[];
}

export interface AppealWorkflow {
  steps: AppealWorkflowStep[];
  currentStep: number;
  estimatedCompletion: Date;
  priority: 'normal' | 'high' | 'urgent';
  fastTrack: boolean;
  complexityLevel: 'simple' | 'moderate' | 'complex' | 'highly_complex';
}

export interface AppealWorkflowStep {
  stepId: string;
  name: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'skipped';
  assignedTo?: string;
  estimatedTime: number;
  actualTime?: number;
  dependencies: string[];
  outputs: string[];
  completedAt?: Date;
}

export interface AppealCommunication {
  communicationId: string;
  from: string;
  to: string[];
  subject: string;
  message: string;
  attachments: string[];
  priority: 'normal' | 'high' | 'urgent';
  sentAt: Date;
  readAt?: Date;
  responseRequired: boolean;
  responseDeadline?: Date;
}

export interface AppealTracking {
  appealId: string;
  statusHistory: StatusHistoryEntry[];
  milestones: Milestone[];
  notifications: NotificationEntry[];
  escalations: EscalationEntry[];
  stakeholders: Stakeholder[];
  documents: DocumentEntry[];
}

export interface StatusHistoryEntry {
  status: AppealStatus;
  changedAt: Date;
  changedBy: string;
  reason: string;
  previousStatus: AppealStatus;
  duration: number;
}

export interface Milestone {
  milestoneId: string;
  name: string;
  description: string;
  targetDate: Date;
  actualDate?: Date;
  status: 'upcoming' | 'due' | 'completed' | 'overdue';
  importance: 'low' | 'medium' | 'high' | 'critical';
}

export interface NotificationEntry {
  notificationId: string;
  type: 'email' | 'sms' | 'push' | 'dashboard';
  recipient: string;
  message: string;
  sentAt: Date;
  readAt?: Date;
  actionRequired: boolean;
}

export interface EscalationEntry {
  escalatedAt: Date;
  escalatedBy: string;
  escalatedTo: string;
  reason: string;
  priority: 'normal' | 'high' | 'urgent' | 'critical';
  resolved: boolean;
  resolvedAt?: Date;
}

export interface Stakeholder {
  stakeholderId: string;
  role: 'appellant' | 'reviewer' | 'expert' | 'advocate' | 'observer';
  permissions: string[];
  notificationPreferences: NotificationPreference[];
  involvement: 'primary' | 'secondary' | 'observer';
}

export interface DocumentEntry {
  documentId: string;
  name: string;
  type: string;
  uploadedBy: string;
  uploadedAt: Date;
  version: number;
  status: 'draft' | 'final' | 'archived';
  accessLevel: 'public' | 'restricted' | 'confidential';
}

export interface NotificationPreference {
  type: 'email' | 'sms' | 'push' | 'dashboard';
  enabled: boolean;
  frequency: 'immediate' | 'daily' | 'weekly';
  events: string[];
}

export interface AppealAnalytics {
  appealTrends: TrendAnalysis[];
  outcomePatterns: PatternAnalysis[];
  reviewerInsights: ReviewerInsight[];
  systemPerformance: PerformanceMetric[];
  userBehavior: UserBehaviorInsight[];
  improvementOpportunities: ImprovementOpportunity[];
}

export interface TrendAnalysis {
  metric: string;
  period: DatePeriod;
  trend: 'increasing' | 'decreasing' | 'stable' | 'volatile';
  changeRate: number;
  significance: number;
  projections: Projection[];
}

export interface PatternAnalysis {
  pattern: string;
  frequency: number;
  correlation: number;
  predictiveValue: number;
  actionItems: string[];
}

export interface ReviewerInsight {
  reviewerId: string;
  strengths: string[];
  improvementAreas: string[];
  specializations: string[];
  recommendedTraining: string[];
  performanceTrend: 'improving' | 'declining' | 'stable';
}

export interface PerformanceMetric {
  metric: string;
  currentValue: number;
  target: number;
  trend: 'improving' | 'declining' | 'stable';
  benchmarks: Benchmark[];
}

export interface UserBehaviorInsight {
  behaviorType: string;
  frequency: number;
  impact: string;
  recommendations: string[];
  interventions: string[];
}

export interface ImprovementOpportunity {
  area: string;
  description: string;
  impact: 'low' | 'medium' | 'high';
  effort: 'low' | 'medium' | 'high';
  priority: number;
  estimatedBenefit: string;
  implementationSteps: string[];
}

export interface Projection {
  timeframe: string;
  projectedValue: number;
  confidence: number;
  assumptions: string[];
}

export interface Benchmark {
  benchmarkType: string;
  value: number;
  source: string;
  date: Date;
}

export type EvidenceType = 
  | 'new_evidence' 
  | 'procedural_error' 
  | 'bias_claim' 
  | 'technical_issue' 
  | 'context_missing' 
  | 'expert_opinion' 
  | 'character_reference'
  | 'system_malfunction'
  | 'misinterpretation'
  | 'incomplete_investigation';

export type AppealOutcome = 
  | 'approved' 
  | 'rejected' 
  | 'modified' 
  | 'dismissed';

export type AppealStatus = 
  | 'submitted' 
  | 'under_review' 
  | 'pending_evidence' 
  | 'expert_review' 
  | 'approved' 
  | 'rejected' 
  | 'withdrawn' 
  | 'expired';

export type BiasType = 
  | 'confirmation_bias' 
  | 'availability_bias' 
  | 'anchoring_bias' 
  | 'cultural_bias' 
  | 'personal_bias' 
  | 'systemic_bias';
