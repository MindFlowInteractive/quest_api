import { Test, TestingModule } from '@nestjs/testing';
import { AntiCheatDetectionService } from '../services/anti-cheat-detection.service';
import { StatisticalAnalysisService } from '../services/statistical-analysis.service';
import { ManualReviewService } from '../services/manual-review.service';
import { AppealService } from '../services/appeal.service';
import { CommunityModerationService } from '../services/community-moderation.service';
import { AntiCheatAnalyticsService } from '../services/anti-cheat-analytics.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CheatDetection } from '../entities/cheat-detection.entity';
import { ManualReview } from '../entities/manual-review.entity';
import { Appeal } from '../entities/appeal.entity';
import { CommunityReport } from '../entities/community-report.entity';

describe('Anti-Cheat System Integration Tests', () => {
  let detectionService: AntiCheatDetectionService;
  let statisticalService: StatisticalAnalysisService;
  let manualReviewService: ManualReviewService;
  let appealService: AppealService;
  let communityService: CommunityModerationService;
  let analyticsService: AntiCheatAnalyticsService;

  const mockRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AntiCheatDetectionService,
        StatisticalAnalysisService,
        ManualReviewService,
        AppealService,
        CommunityModerationService,
        AntiCheatAnalyticsService,
        {
          provide: getRepositoryToken(CheatDetection),
          useValue: mockRepository,
        },
        {
          provide: getRepositoryToken(ManualReview),
          useValue: mockRepository,
        },
        {
          provide: getRepositoryToken(Appeal),
          useValue: mockRepository,
        },
        {
          provide: getRepositoryToken(CommunityReport),
          useValue: mockRepository,
        },
      ],
    }).compile();

    detectionService = module.get<AntiCheatDetectionService>(AntiCheatDetectionService);
    statisticalService = module.get<StatisticalAnalysisService>(StatisticalAnalysisService);
    manualReviewService = module.get<ManualReviewService>(ManualReviewService);
    appealService = module.get<AppealService>(AppealService);
    communityService = module.get<CommunityModerationService>(CommunityModerationService);
    analyticsService = module.get<AntiCheatAnalyticsService>(AntiCheatAnalyticsService);
  });

  describe('Puzzle Solution Validation', () => {
    it('should validate a legitimate puzzle solution', async () => {
      const validSolution = {
        puzzleId: 'test-puzzle-1',
        puzzleType: 'sudoku',
        userId: 'test-user-1',
        moves: [
          { type: 'place', from: null, to: '0,0', value: 1, timestamp: 1000 },
          { type: 'place', from: null, to: '0,1', value: 2, timestamp: 2000 },
          { type: 'place', from: null, to: '0,2', value: 3, timestamp: 3000 },
        ],
        solutionTime: 120000, // 2 minutes
        startTime: Date.now() - 120000,
        endTime: Date.now(),
      };

      const result = await detectionService.validatePuzzleSolution(validSolution);

      expect(result.isValid).toBe(true);
      expect(result.cheatDetected).toBe(false);
      expect(result.confidence).toBeLessThan(0.5);
    });

    it('should detect timing anomalies in puzzle solutions', async () => {
      const suspiciousSolution = {
        puzzleId: 'test-puzzle-2',
        puzzleType: 'sudoku',
        userId: 'test-user-2',
        moves: [
          { type: 'place', from: null, to: '0,0', value: 1, timestamp: 1000 },
          { type: 'place', from: null, to: '0,1', value: 2, timestamp: 1001 }, // Too fast
          { type: 'place', from: null, to: '0,2', value: 3, timestamp: 1002 }, // Too fast
        ],
        solutionTime: 3000, // 3 seconds - too fast for sudoku
        startTime: Date.now() - 3000,
        endTime: Date.now(),
      };

      mockRepository.save.mockResolvedValue({ id: 'detection-1' });

      const result = await detectionService.validatePuzzleSolution(suspiciousSolution);

      expect(result.cheatDetected).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.7);
      expect(result.reasons).toContain('Solution completed too quickly');
      expect(mockRepository.save).toHaveBeenCalled();
    });

    it('should detect impossible move sequences', async () => {
      const impossibleSolution = {
        puzzleId: 'test-puzzle-3',
        puzzleType: 'sliding-puzzle',
        userId: 'test-user-3',
        moves: [
          { type: 'slide', from: '0,0', to: '2,2', value: null, timestamp: 1000 }, // Impossible slide
          { type: 'slide', from: '1,1', to: '0,0', value: null, timestamp: 2000 },
        ],
        solutionTime: 60000,
        startTime: Date.now() - 60000,
        endTime: Date.now(),
      };

      mockRepository.save.mockResolvedValue({ id: 'detection-2' });

      const result = await detectionService.validatePuzzleSolution(impossibleSolution);

      expect(result.cheatDetected).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.8);
      expect(result.reasons).toContain('Invalid move sequence detected');
    });
  });

  describe('Statistical Analysis', () => {
    it('should identify statistical outliers', async () => {
      const playerStats = {
        userId: 'test-user-4',
        averageSolveTime: 300000, // 5 minutes average
        totalSolutions: 100,
        successRate: 0.95,
        recentPerformance: [
          { time: 300000, difficulty: 5 },
          { time: 310000, difficulty: 5 },
          { time: 30000, difficulty: 5 }, // Sudden improvement - suspicious
        ],
      };

      const analysis = await statisticalService.analyzePlayerBehavior(playerStats);

      expect(analysis.isOutlier).toBe(true);
      expect(analysis.suspiciousPatterns).toContain('sudden_improvement');
      expect(analysis.confidence).toBeGreaterThan(0.6);
    });

    it('should detect pattern-based cheating', async () => {
      const movePattern = {
        userId: 'test-user-5',
        moves: Array(50).fill(null).map((_, i) => ({
          timestamp: i * 1000, // Exactly 1 second apart - too regular
          type: 'place',
          difficulty: Math.random() * 10,
        })),
      };

      const analysis = await statisticalService.analyzeMoveTiming(movePattern);

      expect(analysis.isRegular).toBe(true);
      expect(analysis.suspiciousPatterns).toContain('too_regular_timing');
      expect(analysis.confidence).toBeGreaterThan(0.7);
    });
  });

  describe('Manual Review System', () => {
    it('should create manual review for high-confidence detections', async () => {
      const detection = {
        id: 'detection-3',
        userId: 'test-user-6',
        puzzleId: 'test-puzzle-4',
        detectionType: 'timing_anomaly',
        severity: 'high',
        confidence: 0.9,
      };

      mockRepository.create.mockReturnValue({ id: 'review-1' });
      mockRepository.save.mockResolvedValue({ id: 'review-1' });

      const review = await manualReviewService.createReview(detection, 'auto-system');

      expect(mockRepository.create).toHaveBeenCalledWith({
        cheatDetectionId: detection.id,
        reviewerId: 'auto-system',
        status: 'pending',
        priority: 'high',
      });
      expect(mockRepository.save).toHaveBeenCalled();
    });

    it('should assign review to moderator', async () => {
      const reviewId = 'review-2';
      const moderatorId = 'moderator-1';

      mockRepository.findOne.mockResolvedValue({
        id: reviewId,
        status: 'pending',
      });
      mockRepository.save.mockResolvedValue({
        id: reviewId,
        reviewerId: moderatorId,
        status: 'in_progress',
      });

      const result = await manualReviewService.assignReview(reviewId, moderatorId);

      expect(result.reviewerId).toBe(moderatorId);
      expect(result.status).toBe('in_progress');
    });
  });

  describe('Appeal Process', () => {
    it('should allow users to appeal cheat detections', async () => {
      const appealData = {
        appellantId: 'test-user-7',
        cheatDetectionId: 'detection-4',
        reason: 'I was playing legitimately, this is a false positive',
        evidence: { screenRecording: 'url-to-recording' },
      };

      mockRepository.create.mockReturnValue({ id: 'appeal-1' });
      mockRepository.save.mockResolvedValue({ id: 'appeal-1' });

      const appeal = await appealService.createAppeal(appealData);

      expect(mockRepository.create).toHaveBeenCalledWith({
        appellantId: appealData.appellantId,
        cheatDetectionId: appealData.cheatDetectionId,
        reason: appealData.reason,
        evidence: appealData.evidence,
        status: 'pending',
      });
    });

    it('should process appeal review', async () => {
      const appealId = 'appeal-2';
      const reviewerId = 'moderator-2';
      const reviewData = {
        outcome: 'false_positive_confirmed',
        reviewerNotes: 'After review, this appears to be a false positive',
      };

      mockRepository.findOne.mockResolvedValue({
        id: appealId,
        status: 'pending',
      });
      mockRepository.save.mockResolvedValue({
        id: appealId,
        status: 'approved',
        outcome: reviewData.outcome,
      });

      const result = await appealService.reviewAppeal(appealId, reviewerId, reviewData);

      expect(result.status).toBe('approved');
      expect(result.outcome).toBe('false_positive_confirmed');
    });
  });

  describe('Community Moderation', () => {
    it('should allow community reporting of suspicious behavior', async () => {
      const reportData = {
        reporterId: 'reporter-1',
        reportedUserId: 'suspected-cheater-1',
        reportType: 'cheating',
        description: 'This user is solving puzzles impossibly fast',
        evidence: { timestamps: [1000, 1001, 1002] },
      };

      mockRepository.create.mockReturnValue({ id: 'report-1' });
      mockRepository.save.mockResolvedValue({ id: 'report-1' });

      const report = await communityService.createReport(reportData);

      expect(mockRepository.create).toHaveBeenCalledWith({
        reporterId: reportData.reporterId,
        reportedUserId: reportData.reportedUserId,
        reportType: reportData.reportType,
        description: reportData.description,
        evidence: reportData.evidence,
        status: 'pending',
      });
    });
  });

  describe('Analytics and Improvement', () => {
    it('should track anti-cheat performance metrics', () => {
      // Record several submissions with known outcomes
      analyticsService.recordSubmission(false); // Legitimate
      analyticsService.recordSubmission(false); // Legitimate
      analyticsService.recordSubmission(true, {
        userId: 'cheater-1',
        puzzleId: 'puzzle-1',
        puzzleType: 'sudoku',
        detectedAt: new Date(),
        detectionType: 'timing_anomaly',
      }); // Cheat detected

      analyticsService.recordFalsePositive(); // One false positive
      
      const analytics = analyticsService.getAnalytics();

      expect(analytics.totalSubmissions).toBe(3);
      expect(analytics.totalCheatDetections).toBe(1);
      expect(analytics.falsePositives).toBe(1);
      expect(analytics.detectionRate).toBeCloseTo(0.33, 2);
      expect(analytics.falsePositiveRate).toBe(1);
    });

    it('should provide event history for analysis', () => {
      const testEvent = {
        userId: 'test-user',
        puzzleId: 'test-puzzle',
        puzzleType: 'sudoku',
        detectedAt: new Date(),
        detectionType: 'statistical_outlier',
        details: { confidence: 0.85 },
      };

      analyticsService.recordSubmission(true, testEvent);

      const events = analyticsService.getEvents();
      expect(events).toContain(testEvent);
      expect(events.length).toBe(1);
    });
  });
});
