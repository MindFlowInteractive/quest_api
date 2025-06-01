import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import {
  type TutorialSession,
  SessionStatus,
} from '../entities/tutorial-session.entity';
import {
  ProgressStatus,
  TutorialProgress,
} from '../entities/utorial-progress.entity';
import { TutorialAnalyticsService } from './tutorial-analytics.service';
import {
  SubmitFeedbackDto,
  UpdateProgressDto,
} from '../dto/create-tutorial.dto';
import { AnalyticsEventType } from '../entities/tutorial-analytics.entity';

@Injectable()
export class TutorialProgressService {
  private readonly logger = new Logger(TutorialProgressService.name);

  constructor(
    private readonly sessionRepository: Repository<TutorialSession>,
    private readonly analyticsService: TutorialAnalyticsService,
    @InjectRepository(TutorialProgress)
    private readonly progressRepository: Repository<TutorialProgress>,
  ) {}

  async startTutorial(
    userId: string,
    tutorialId: string,
    deviceInfo?: Record<string, any>,
  ): Promise<{ progress: TutorialProgress; session: TutorialSession }> {
    // Get or create progress record
    let progress = await this.getUserProgress(userId, tutorialId);

    if (!progress) {
      progress = this.progressRepository.create({
        userId,
        tutorialId,
        status: ProgressStatus.IN_PROGRESS,
        currentStepIndex: 0,
        completedSteps: 0,
        totalSteps: 0, // Will be updated when tutorial is loaded
      });
    } else if (progress.status === ProgressStatus.PAUSED) {
      progress.status = ProgressStatus.IN_PROGRESS;
    }

    progress.lastAccessedAt = new Date();
    progress = await this.progressRepository.save(progress);

    // Create new session
    const session = this.sessionRepository.create({
      userId,
      tutorialId,
      status: SessionStatus.ACTIVE,
      startedAt: new Date(),
      deviceInfo,
    });

    const savedSession = await this.sessionRepository.save(session);

    // Record analytics
    await this.analyticsService.recordEvent(
      'tutorial_started' as AnalyticsEventType,
      userId,
      tutorialId,
      undefined,
      savedSession.id,
      {
        deviceInfo,
      },
    );

    return { progress, session: savedSession };
  }

  async updateProgress(
    userId: string,
    tutorialId: string,
    updateDto: UpdateProgressDto,
  ): Promise<TutorialProgress> {
    const progress = await this.getUserProgress(userId, tutorialId);

    if (!progress) {
      throw new Error('Tutorial progress not found');
    }

    // Update progress fields
    Object.assign(progress, updateDto);

    // Calculate completion percentage
    if (progress.totalSteps > 0) {
      progress.completionPercentage =
        (progress.completedSteps / progress.totalSteps) * 100;
    }

    progress.lastAccessedAt = new Date();

    // Check if tutorial is completed
    if (
      progress.completedSteps >= progress.totalSteps &&
      progress.status !== ProgressStatus.COMPLETED
    ) {
      progress.status = ProgressStatus.COMPLETED;
      progress.completedAt = new Date();

      // Record completion analytics
      await this.analyticsService.recordEvent(
        'tutorial_completed' as AnalyticsEventType,
        userId,
        tutorialId,
        undefined,
        undefined,
        {
          timeSpent: progress.timeSpentSeconds,
          attempts: progress.attempts,
          hintsUsed: progress.hintsUsed,
          errorsCount: progress.errorsCount,
        },
      );
    }

    return this.progressRepository.save(progress);
  }

  async pauseTutorial(
    userId: string,
    tutorialId: string,
  ): Promise<TutorialProgress> {
    const progress = await this.getUserProgress(userId, tutorialId);

    if (!progress) {
      throw new Error('Tutorial progress not found');
    }

    progress.status = ProgressStatus.PAUSED;
    progress.pausedAt = new Date();

    // End current session
    await this.endCurrentSession(userId, tutorialId, SessionStatus.PAUSED);

    return this.progressRepository.save(progress);
  }

  async resumeTutorial(
    userId: string,
    tutorialId: string,
  ): Promise<TutorialProgress> {
    const progress = await this.getUserProgress(userId, tutorialId);

    if (!progress) {
      throw new Error('Tutorial progress not found');
    }

    progress.status = ProgressStatus.IN_PROGRESS;
    progress.lastAccessedAt = new Date();

    return this.progressRepository.save(progress);
  }

  async skipTutorial(
    userId: string,
    tutorialId: string,
  ): Promise<TutorialProgress> {
    const progress = await this.getUserProgress(userId, tutorialId);

    if (!progress) {
      throw new Error('Tutorial progress not found');
    }

    progress.status = ProgressStatus.SKIPPED;
    progress.completedAt = new Date();

    // End current session
    await this.endCurrentSession(userId, tutorialId, SessionStatus.COMPLETED);

    // Record analytics
    await this.analyticsService.recordEvent(
      'tutorial_skipped' as AnalyticsEventType,
      userId,
      tutorialId,
      undefined,
      undefined,
      {
        stepsCompleted: progress.completedSteps,
        timeSpent: progress.timeSpentSeconds,
      },
    );

    return this.progressRepository.save(progress);
  }

  async submitFeedback(
    userId: string,
    tutorialId: string,
    feedbackDto: SubmitFeedbackDto,
  ): Promise<TutorialProgress> {
    const progress = await this.getUserProgress(userId, tutorialId);

    if (!progress) {
      throw new Error('Tutorial progress not found');
    }

    progress.feedback = feedbackDto;
    const savedProgress = await this.progressRepository.save(progress);

    // Record analytics
    await this.analyticsService.recordEvent(
      'feedback_submitted' as AnalyticsEventType,
      userId,
      tutorialId,
      undefined,
      undefined,
      feedbackDto,
    );

    return savedProgress;
  }

  async getUserProgress(
    userId: string,
    tutorialId: string,
  ): Promise<TutorialProgress | null> {
    return this.progressRepository.findOne({
      where: { userId, tutorialId },
      relations: ['tutorial'],
    });
  }

  async getUserProgressList(userId: string): Promise<TutorialProgress[]> {
    return this.progressRepository.find({
      where: { userId },
      relations: ['tutorial'],
      order: { lastAccessedAt: 'DESC' },
    });
  }

  async addBookmark(
    userId: string,
    tutorialId: string,
    stepId: string,
  ): Promise<void> {
    const progress = await this.getUserProgress(userId, tutorialId);

    if (!progress) {
      throw new Error('Tutorial progress not found');
    }

    if (!progress.bookmarks) {
      progress.bookmarks = [];
    }

    if (!progress.bookmarks.includes(stepId)) {
      progress.bookmarks.push(stepId);
      await this.progressRepository.save(progress);

      // Record analytics
      await this.analyticsService.recordEvent(
        'bookmark_added' as AnalyticsEventType,
        userId,
        tutorialId,
        stepId,
      );
    }
  }

  async removeBookmark(
    userId: string,
    tutorialId: string,
    stepId: string,
  ): Promise<void> {
    const progress = await this.getUserProgress(userId, tutorialId);

    if (!progress || !progress.bookmarks) {
      return;
    }

    progress.bookmarks = progress.bookmarks.filter((id) => id !== stepId);
    await this.progressRepository.save(progress);
  }

  async updateAdaptiveData(
    userId: string,
    tutorialId: string,
    adaptiveData: Record<string, any>,
  ): Promise<void> {
    const progress = await this.getUserProgress(userId, tutorialId);

    if (!progress) {
      throw new Error('Tutorial progress not found');
    }

    progress.adaptiveData = {
      ...progress.adaptiveData,
      ...adaptiveData,
    };

    await this.progressRepository.save(progress);
  }

  async getProgressStats(userId: string): Promise<{
    totalTutorials: number;
    completedTutorials: number;
    inProgressTutorials: number;
    totalTimeSpent: number;
    averageCompletionRate: number;
  }> {
    const allProgress = await this.progressRepository.find({
      where: { userId },
    });

    const totalTutorials = allProgress.length;
    const completedTutorials = allProgress.filter(
      (p) => p.status === ProgressStatus.COMPLETED,
    ).length;
    const inProgressTutorials = allProgress.filter(
      (p) => p.status === ProgressStatus.IN_PROGRESS,
    ).length;
    const totalTimeSpent = allProgress.reduce(
      (sum, p) => sum + p.timeSpentSeconds,
      0,
    );

    const completionRates = allProgress.map((p) => p.completionPercentage);
    const averageCompletionRate =
      completionRates.length > 0
        ? completionRates.reduce((sum, rate) => sum + rate, 0) /
          completionRates.length
        : 0;

    return {
      totalTutorials,
      completedTutorials,
      inProgressTutorials,
      totalTimeSpent,
      averageCompletionRate,
    };
  }

  private async endCurrentSession(
    userId: string,
    tutorialId: string,
    status: SessionStatus,
  ): Promise<void> {
    const activeSession = await this.sessionRepository.findOne({
      where: {
        userId,
        tutorialId,
        status: SessionStatus.ACTIVE,
      },
      order: { startedAt: 'DESC' },
    });

    if (activeSession) {
      activeSession.status = status;
      activeSession.endedAt = new Date();
      activeSession.durationSeconds = Math.floor(
        (activeSession.endedAt.getTime() - activeSession.startedAt.getTime()) /
          1000,
      );

      await this.sessionRepository.save(activeSession);
    }
  }
}
