export interface CommunityReport {
  type: ReportType;
  reason: string;
  description: string;
  evidence?: ReportEvidence;
  sessionId?: string;
  puzzleId?: string;
  urgency: 'normal' | 'high' | 'critical';
  anonymous: boolean;
  witnessUsers?: string[];
  relatedReports?: string[];
  tags?: string[];
}

export interface ReportEvidence {
  screenshots?: string[];
  videoUrl?: string;
  chatLogs?: ChatLog[];
  witnessStatements?: string[];
  technicalData?: any;
  timestamps?: ReportTimestamp[];
  additionalFiles?: FileAttachment[];
}

export interface ModerationAction {
  actionType: ActionType;
  reasoning: string;
  duration?: string;
  conditions?: string[];
  escalate?: boolean;
  followUp?: FollowUpAction;
  publicNotice?: boolean;
  appealable?: boolean;
  effectiveDate?: Date;
  metadata?: ActionMetadata;
}

export interface CommunityModerator {
  userId: string;
  moderatorLevel: ModeratorLevel;
  specializations: ModeratorSpecialization[];
  reputation: number;
  metrics: ModeratorMetrics;
  permissions: ModeratorPermission[];
  availability: ModeratorAvailability;
  trainingCompleted: string[];
  certifications: string[];
  isActive: boolean;
  joinedAt: Date;
  lastActiveAt: Date;
}

export interface ReportAnalysis {
  reportId: string;
  reportSummary: ReportSummary;
  evidenceAnalysis: EvidenceAnalysis;
  communityFeedback: CommunityFeedback;
  similarReports: SimilarReport[];
  riskAssessment: RiskAssessment;
  recommendedAction: string;
  confidenceLevel: number;
  priorityJustification: string;
  estimatedResolutionTime: number;
  stakeholders: string[];
  timeline: AnalysisTimeline[];
}

export interface CommunityMetrics {
  period: 'day' | 'week' | 'month' | 'year';
  startDate: Date;
  endDate: Date;
  totalReports: number;
  resolvedReports: number;
  pendingReports: number;
  resolutionRate: number;
  averageResolutionTime: number;
  communityParticipation: number;
  accuracyRate: number;
  falsePositiveRate: number;
  moderatorPerformance: ModeratorPerformance[];
  reportsByType: { [key in ReportType]: number };
  severityDistribution: SeverityDistribution;
  topReporters: TopReporter[];
  communityTrustScore: number;
  trends: MetricTrend[];
  comparisons: PeriodComparison[];
}

export interface ReputationSystem {
  levels: ReputationLevel[];
  rewards: ReputationReward[];
  penalties: ReputationPenalty[];
  calculations: ReputationCalculation;
  leaderboard: ReputationEntry[];
  achievements: ReputationAchievement[];
  milestones: ReputationMilestone[];
}

export interface ChatLog {
  timestamp: Date;
  userId: string;
  message: string;
  type: 'public' | 'private' | 'system';
  reported: boolean;
}

export interface ReportTimestamp {
  event: string;
  timestamp: Date;
  context: string;
  verified: boolean;
}

export interface FileAttachment {
  filename: string;
  fileType: string;
  size: number;
  uploadDate: Date;
  verified: boolean;
  description?: string;
}

export interface FollowUpAction {
  type: string;
  description: string;
  dueDate: Date;
  assignedTo?: string;
  priority: 'low' | 'medium' | 'high';
}

export interface ActionMetadata {
  category: string;
  tags: string[];
  precedentSet: boolean;
  appealDeadline?: Date;
  publicityLevel: 'none' | 'limited' | 'public';
  dataRetention: string;
}

export interface ModeratorMetrics {
  totalReportsHandled: number;
  averageResolutionTime: number;
  accuracyRate: number;
  communityFeedbackScore: number;
  escalationRate: number;
  overturnRate: number;
  responseTime: number;
  consistency: number;
  specialtyPerformance: { [key: string]: number };
}

export interface ModeratorAvailability {
  timezone: string;
  hoursPerWeek: number;
  preferredShifts: TimeSlot[];
  unavailablePeriods: UnavailablePeriod[];
  maxConcurrentCases: number;
  emergencyContact: boolean;
}

export interface ReportSummary {
  reportType: ReportType;
  severity: SeverityLevel;
  urgency: UrgencyLevel;
  credibility: number;
  completeness: number;
  clarity: number;
  keyPoints: string[];
  concerns: string[];
}

export interface EvidenceAnalysis {
  evidenceQuality: EvidenceQuality;
  evidenceTypes: EvidenceType[];
  verificationStatus: VerificationStatus;
  inconsistencies: string[];
  strengths: string[];
  weaknesses: string[];
  additionalEvidenceNeeded: string[];
}

export interface CommunityFeedback {
  totalVotes: number;
  voteDistribution: VoteDistribution;
  consensus: CommunityConsensus;
  comments: CommunityComment[];
  credibilityScore: number;
  participationLevel: string;
}

export interface SimilarReport {
  reportId: string;
  similarity: number;
  outcome: string;
  timeToResolution: number;
  lessons: string[];
  relevantFactors: string[];
}

export interface RiskAssessment {
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  riskFactors: RiskFactor[];
  mitigationStrategies: string[];
  escalationTriggers: string[];
  monitoringRequired: boolean;
  publicityRisk: number;
  legalRisk: number;
  reputationalRisk: number;
}

export interface AnalysisTimeline {
  phase: string;
  startTime: Date;
  endTime?: Date;
  status: 'pending' | 'in_progress' | 'completed';
  responsible: string;
  deliverables: string[];
}

export interface ModeratorPerformance {
  moderatorId: string;
  level: ModeratorLevel;
  reportsHandled: number;
  averageTime: number;
  accuracyRate: number;
  userSatisfaction: number;
  specializations: string[];
  improvements: string[];
  recognition: string[];
}

export interface SeverityDistribution {
  low: number;
  medium: number;
  high: number;
  critical: number;
  percentages: { [key: string]: number };
}

export interface TopReporter {
  userId: string;
  reportCount: number;
  accuracyRate: number;
  reputation: number;
  specializations: string[];
  contributions: string[];
}

export interface MetricTrend {
  metric: string;
  direction: 'increasing' | 'decreasing' | 'stable';
  rate: number;
  significance: number;
  projections: TrendProjection[];
}

export interface PeriodComparison {
  metric: string;
  currentValue: number;
  previousValue: number;
  changePercent: number;
  significance: 'improvement' | 'decline' | 'neutral';
}

export interface ReputationLevel {
  level: number;
  name: string;
  minPoints: number;
  maxPoints: number;
  benefits: string[];
  responsibilities: string[];
  requirements: string[];
}

export interface ReputationReward {
  action: string;
  points: number;
  multiplier?: number;
  conditions: string[];
  cooldown?: number;
  maxPerPeriod?: number;
}

export interface ReputationPenalty {
  violation: string;
  points: number;
  duration?: number;
  conditions: string[];
  escalation?: string;
  appeal?: boolean;
}

export interface ReputationCalculation {
  baseFormula: string;
  factors: ReputationFactor[];
  decayRate: number;
  recencyWeight: number;
  categoryWeights: { [key: string]: number };
}

export interface ReputationEntry {
  userId: string;
  username: string;
  reputation: number;
  level: string;
  badges: string[];
  contributions: string[];
  rank: number;
}

export interface ReputationAchievement {
  id: string;
  name: string;
  description: string;
  requirements: string[];
  reward: number;
  badge: string;
  rarity: 'common' | 'uncommon' | 'rare' | 'legendary';
}

export interface ReputationMilestone {
  points: number;
  title: string;
  description: string;
  benefits: string[];
  celebratory: boolean;
}

export interface TimeSlot {
  dayOfWeek: number;
  startHour: number;
  endHour: number;
  timezone: string;
}

export interface UnavailablePeriod {
  startDate: Date;
  endDate: Date;
  reason: string;
  type: 'vacation' | 'training' | 'personal' | 'other';
}

export interface EvidenceQuality {
  authenticity: number;
  relevance: number;
  completeness: number;
  clarity: number;
  timeliness: number;
  corroboration: number;
  overall: number;
}

export interface VerificationStatus {
  verified: boolean;
  verificationMethod: string;
  verifiedBy: string;
  verificationDate: Date;
  confidence: number;
  issues: string[];
}

export interface VoteDistribution {
  legitimate: number;
  suspicious: number;
  cheat: number;
  abstain: number;
  invalidated: number;
}

export interface CommunityComment {
  commentId: string;
  userId: string;
  content: string;
  timestamp: Date;
  votes: CommentVotes;
  moderated: boolean;
  helpful: boolean;
}

export interface CommentVotes {
  helpful: number;
  unhelpful: number;
  inappropriate: number;
}

export interface RiskFactor {
  factor: string;
  severity: 'low' | 'medium' | 'high';
  probability: number;
  impact: string;
  mitigation: string[];
}

export interface TrendProjection {
  timeframe: string;
  projectedValue: number;
  confidence: number;
  assumptions: string[];
}

export interface ReputationFactor {
  name: string;
  weight: number;
  description: string;
  calculation: string;
}

export interface CommunityVote {
  voteId: string;
  reportId: string;
  voterId: string;
  vote: VoteOption;
  reasoning?: string;
  confidence: number;
  timestamp: Date;
  weight: number;
  expertise: string[];
}

export interface CommunityConsensus {
  reached: boolean;
  consensusType: VoteOption | 'inconclusive';
  confidence: number;
  agreement: number;
  dissent: number;
  abstentions: number;
  qualityScore: number;
}

export interface ModerationDecision {
  decisionId: string;
  reportId: string;
  moderatorId: string;
  decision: ModerationAction;
  reasoning: string;
  evidence: string[];
  timestamp: Date;
  confidence: number;
  reviewable: boolean;
  publicized: boolean;
}

export interface EscalationPath {
  currentLevel: ModeratorLevel;
  nextLevel: ModeratorLevel;
  criteria: EscalationCriteria[];
  autoEscalation: boolean;
  timeLimit: number;
  approvers: string[];
}

export interface EscalationCriteria {
  criterion: string;
  threshold: number;
  met: boolean;
  weight: number;
}

export interface AppealProcess {
  appealable: boolean;
  appealWindow: number;
  appealLevels: AppealLevel[];
  requirements: string[];
  fees: AppealFee[];
  procedures: AppealProcedure[];
}

export interface AppealLevel {
  level: string;
  authority: string;
  timeLimit: number;
  bindingDecision: boolean;
  finalAppeal: boolean;
}

export interface AppealFee {
  feeType: string;
  amount: number;
  waivable: boolean;
  refundable: boolean;
  conditions: string[];
}

export interface AppealProcedure {
  step: string;
  description: string;
  timeLimit: number;
  required: boolean;
  documentation: string[];
}

export interface CommunityGuidelines {
  sections: GuidelineSection[];
  lastUpdated: Date;
  version: string;
  enforcement: EnforcementPolicy;
  examples: GuidelineExample[];
}

export interface GuidelineSection {
  title: string;
  content: string;
  importance: 'high' | 'medium' | 'low';
  examples: string[];
  consequences: string[];
}

export interface EnforcementPolicy {
  warnings: WarningPolicy;
  escalation: EscalationPolicy;
  appeals: AppealPolicy;
  rehabilitation: RehabilitationPolicy;
}

export interface WarningPolicy {
  maxWarnings: number;
  warningDuration: number;
  escalationTriggers: string[];
  documentation: boolean;
}

export interface EscalationPolicy {
  triggers: string[];
  levels: string[];
  authorities: string[];
  timelines: number[];
}

export interface AppealPolicy {
  appealWindow: number;
  appealLevels: number;
  feeStructure: string;
  procedures: string[];
}

export interface RehabilitationPolicy {
  programs: string[];
  requirements: string[];
  duration: number;
  monitoring: string[];
}

export interface GuidelineExample {
  scenario: string;
  violation: boolean;
  explanation: string;
  consequence: string;
  prevention: string[];
}

export type ReportType = 
  | 'cheating' 
  | 'harassment' 
  | 'exploitation' 
  | 'griefing' 
  | 'inappropriate_content' 
  | 'account_sharing' 
  | 'botting'
  | 'spam'
  | 'impersonation'
  | 'doxxing'
  | 'threat'
  | 'discrimination';

export type ActionType = 
  | 'dismiss' 
  | 'warn' 
  | 'restrict' 
  | 'ban' 
  | 'escalate'
  | 'monitor'
  | 'educate'
  | 'mediate'
  | 'investigate'
  | 'suspend';

export type ModeratorLevel = 
  | 'junior' 
  | 'senior' 
  | 'expert' 
  | 'admin'
  | 'specialist'
  | 'lead'
  | 'chief';

export type ModeratorSpecialization = 
  | 'anti_cheat' 
  | 'harassment' 
  | 'technical' 
  | 'community'
  | 'appeals'
  | 'investigation'
  | 'education'
  | 'crisis';

export type ModeratorPermission = 
  | 'view_reports' 
  | 'moderate_content' 
  | 'ban_users' 
  | 'escalate_cases'
  | 'access_data'
  | 'train_moderators'
  | 'policy_changes'
  | 'system_admin';

export type SeverityLevel = 'low' | 'medium' | 'high' | 'critical';

export type UrgencyLevel = 'normal' | 'high' | 'critical' | 'emergency';

export type EvidenceType = 
  | 'screenshot' 
  | 'video' 
  | 'chat_log' 
  | 'witness' 
  | 'technical'
  | 'behavioral'
  | 'statistical'
  | 'forensic';

export type VoteOption = 'legitimate' | 'suspicious' | 'cheat' | 'insufficient_evidence';
