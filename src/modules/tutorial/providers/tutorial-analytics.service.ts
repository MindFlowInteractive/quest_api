import { Injectable, Logger } from '@nestjs/common';
import { type Repository, Between, In } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import {
  type TutorialAnalytics,
  AnalyticsEventType,
} from '../entities/tutorial-analytics.entity';

export interface AnalyticsReport {
  totalEvents: number;
  eventBreakdown: Record<AnalyticsEventType, number>;
  tutorialPerformance: Array<{
    tutorialId: string;
    completionRate: number;
    averageTime: number;
    dropoffRate: number;
  }>;
  userEngagement: {
    activeUsers: number;
    averageSessionTime: number;
    returnRate: number;
  };
  timeSeriesData: Array<{
    date: string;
    events: number;
    completions: number;
  }>;
}

@Injectable()
export class TutorialAnalyticsService {
  private readonly logger = new Logger(TutorialAnalyticsService.name);

  constructor(private analyticsRepository: Repository<TutorialAnalytics>) {}

  async recordEvent(
    eventType: AnalyticsEventType,
    userId: string,
    tutorialId?: string,
    stepId?: string,
    sessionId?: string,
    eventData?: Record<string, any>,
    userAgent?: string,
    ipAddress?: string,
  ): Promise<void> {
    try {
      const analytics = this.analyticsRepository.create({
        eventType,
        userId,
        tutorialId,
        stepId,
        sessionId,
        eventData,
        userAgent,
        ipAddress,
      });

      await this.analyticsRepository.save(analytics);
    } catch (error) {
      this.logger.error('Failed to record analytics event:', error);
    }
  }

  async getAnalyticsReport(
    startDate: Date,
    endDate: Date,
    tutorialId?: string,
  ): Promise<AnalyticsReport> {
    const whereCondition: any = {
      createdAt: Between(startDate, endDate),
    };

    if (tutorialId) {
      whereCondition.tutorialId = tutorialId;
    }

    const events = await this.analyticsRepository.find({
      where: whereCondition,
    });

    // Calculate event breakdown
    const eventBreakdown: Record<AnalyticsEventType, number> = {} as any;
    Object.values(AnalyticsEventType).forEach((type) => {
      eventBreakdown[type] = 0;
    });

    events.forEach((event) => {
      eventBreakdown[event.eventType]++;
    });

    // Calculate tutorial performance
    const tutorialPerformance = await this.calculateTutorialPerformance(
      startDate,
      endDate,
    );

    // Calculate user engagement
    const userEngagement = await this.calculateUserEngagement(
      startDate,
      endDate,
    );

    // Generate time series data
    const timeSeriesData = await this.generateTimeSeriesData(
      startDate,
      endDate,
    );

    return {
      totalEvents: events.length,
      eventBreakdown,
      tutorialPerformance,
      userEngagement,
      timeSeriesData,
    };
  }

  async getTutorialEffectiveness(tutorialId: string): Promise<{
    completionRate: number;
    averageRating: number;
    averageTime: number;
    commonDropoffPoints: Array<{ stepIndex: number; dropoffCount: number }>;
    userFeedback: Array<{ rating: number; comments: string }>;
  }> {
    // Get tutorial completion events
    const completionEvents = await this.analyticsRepository.find({
      where: {
        tutorialId,
        eventType: AnalyticsEventType.TUTORIAL_COMPLETED,
      },
    });

    const startEvents = await this.analyticsRepository.find({
      where: {
        tutorialId,
        eventType: AnalyticsEventType.TUTORIAL_STARTED,
      },
    });

    const completionRate =
      startEvents.length > 0
        ? (completionEvents.length / startEvents.length) * 100
        : 0;

    // Calculate average time from completion events
    const completionTimes = completionEvents
      .map((event) => event.eventData?.timeSpent)
      .filter((time) => time !== undefined);

    const averageTime =
      completionTimes.length > 0
        ? completionTimes.reduce((sum, time) => sum + time, 0) /
          completionTimes.length
        : 0;

    // Get feedback events
    const feedbackEvents = await this.analyticsRepository.find({
      where: {
        tutorialId,
        eventType: AnalyticsEventType.FEEDBACK_SUBMITTED,
      },
    });

    const ratings = feedbackEvents
      .map((event) => event.eventData?.rating)
      .filter((rating) => rating !== undefined);

    const averageRating =
      ratings.length > 0
        ? ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length
        : 0;

    // Find common dropoff points
    const abandonEvents = await this.analyticsRepository.find({
      where: {
        tutorialId,
        eventType: AnalyticsEventType.TUTORIAL_ABANDONED,
      },
    });

    const dropoffPoints: Record<number, number> = {};
    abandonEvents.forEach((event) => {
      const stepIndex = event.eventData?.stepIndex || 0;
      dropoffPoints[stepIndex] = (dropoffPoints[stepIndex] || 0) + 1;
    });

    const commonDropoffPoints = Object.entries(dropoffPoints)
      .map(([stepIndex, count]) => ({
        stepIndex: Number.parseInt(stepIndex),
        dropoffCount: count,
      }))
      .sort((a, b) => b.dropoffCount - a.dropoffCount)
      .slice(0, 5);

    const userFeedback = feedbackEvents.map((event) => ({
      rating: event.eventData?.rating || 0,
      comments: event.eventData?.comments || '',
    }));

    return {
      completionRate,
      averageRating,
      averageTime,
      commonDropoffPoints,
      userFeedback,
    };
  }

  async getUserLearningPattern(userId: string): Promise<{
    preferredLearningTime: string;
    averageSessionDuration: number;
    learningPace: 'slow' | 'normal' | 'fast';
    strugglingAreas: string[];
    strengths: string[];
  }> {
    const userEvents = await this.analyticsRepository.find({
      where: { userId },
      order: { createdAt: 'ASC' },
    });

    // Analyze learning time preferences
    const hourCounts: Record<number, number> = {};
    userEvents.forEach((event) => {
      const hour = event.createdAt.getHours();
      hourCounts[hour] = (hourCounts[hour] || 0) + 1;
    });

    const preferredHour = Object.entries(hourCounts).sort(
      ([, a], [, b]) => b - a,
    )[0]?.[0];

    const preferredLearningTime = this.getTimeOfDay(
      Number.parseInt(preferredHour || '12'),
    );

    // Calculate average session duration
    const sessionEvents = userEvents.filter(
      (event) =>
        event.eventType === AnalyticsEventType.TUTORIAL_STARTED ||
        event.eventType === AnalyticsEventType.TUTORIAL_COMPLETED,
    );

    const sessionDurations = sessionEvents
      .map((event) => event.eventData?.timeSpent)
      .filter((duration) => duration !== undefined);

    const averageSessionDuration =
      sessionDurations.length > 0
        ? sessionDurations.reduce((sum, duration) => sum + duration, 0) /
          sessionDurations.length
        : 0;

    // Determine learning pace based on completion times
    const completionEvents = userEvents.filter(
      (event) => event.eventType === AnalyticsEventType.TUTORIAL_COMPLETED,
    );

    const averageCompletionTime =
      completionEvents.length > 0
        ? completionEvents.reduce(
            (sum, event) => sum + (event.eventData?.timeSpent || 0),
            0,
          ) / completionEvents.length
        : 0;

    let learningPace: 'slow' | 'normal' | 'fast' = 'normal';
    if (averageCompletionTime > 1800)
      learningPace = 'slow'; // > 30 minutes
    else if (averageCompletionTime < 600)
      learningPace = 'fast'; // < 10 minutes
    // > 30 minutes
    else if (averageCompletionTime < 600) learningPace = 'fast'; // < 10 minutes

    // Identify struggling areas and strengths
    const errorEvents = userEvents.filter(
      (event) => event.eventType === AnalyticsEventType.ERROR_OCCURRED,
    );

    const hintEvents = userEvents.filter(
      (event) => event.eventType === AnalyticsEventType.HINT_USED,
    );

    const strugglingAreas = this.identifyStrugglingAreas(
      errorEvents,
      hintEvents,
    );
    const strengths = this.identifyStrengths(completionEvents);

    return {
      preferredLearningTime,
      averageSessionDuration,
      learningPace,
      strugglingAreas,
      strengths,
    };
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async generateDailyReport(): Promise<void> {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    try {
      const report = await this.getAnalyticsReport(yesterday, today);

      this.logger.log(`Daily Analytics Report:
        Total Events: ${report.totalEvents}
        Tutorial Completions: ${report.eventBreakdown[AnalyticsEventType.TUTORIAL_COMPLETED]}
        Active Users: ${report.userEngagement.activeUsers}
        Average Session Time: ${report.userEngagement.averageSessionTime}s
      `);

      // Store or send report as needed
    } catch (error) {
      this.logger.error('Failed to generate daily analytics report:', error);
    }
  }

  @Cron(CronExpression.EVERY_1ST_DAY_OF_MONTH_AT_MIDNIGHT)
  async cleanupOldAnalytics(): Promise<void> {
    const retentionDays = 90; // Keep analytics for 90 days
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    try {
      const result = await this.analyticsRepository.delete({
        createdAt: Between(new Date('1970-01-01'), cutoffDate),
      });

      this.logger.log(`Cleaned up ${result.affected} old analytics records`);
    } catch (error) {
      this.logger.error('Failed to cleanup old analytics:', error);
    }
  }

  private async calculateTutorialPerformance(
    startDate: Date,
    endDate: Date,
  ): Promise<
    Array<{
      tutorialId: string;
      completionRate: number;
      averageTime: number;
      dropoffRate: number;
    }>
  > {
    const events = await this.analyticsRepository.find({
      where: {
        createdAt: Between(startDate, endDate),
        eventType: In([
          AnalyticsEventType.TUTORIAL_STARTED,
          AnalyticsEventType.TUTORIAL_COMPLETED,
          AnalyticsEventType.TUTORIAL_ABANDONED,
        ]),
      },
    });

    const tutorialStats: Record<string, any> = {};

    events.forEach((event) => {
      if (!event.tutorialId) return;

      if (!tutorialStats[event.tutorialId]) {
        tutorialStats[event.tutorialId] = {
          started: 0,
          completed: 0,
          abandoned: 0,
          totalTime: 0,
          completionTimes: [],
        };
      }

      const stats = tutorialStats[event.tutorialId];

      switch (event.eventType) {
        case AnalyticsEventType.TUTORIAL_STARTED:
          stats.started++;
          break;
        case AnalyticsEventType.TUTORIAL_COMPLETED:
          stats.completed++;
          if (event.eventData?.timeSpent) {
            stats.completionTimes.push(event.eventData.timeSpent);
          }
          break;
        case AnalyticsEventType.TUTORIAL_ABANDONED:
          stats.abandoned++;
          break;
      }
    });

    return Object.entries(tutorialStats).map(
      ([tutorialId, stats]: [string, any]) => ({
        tutorialId,
        completionRate:
          stats.started > 0 ? (stats.completed / stats.started) * 100 : 0,
        averageTime:
          stats.completionTimes.length > 0
            ? stats.completionTimes.reduce(
                (sum: number, time: number) => sum + time,
                0,
              ) / stats.completionTimes.length
            : 0,
        dropoffRate:
          stats.started > 0 ? (stats.abandoned / stats.started) * 100 : 0,
      }),
    );
  }

  private async calculateUserEngagement(
    startDate: Date,
    endDate: Date,
  ): Promise<{
    activeUsers: number;
    averageSessionTime: number;
    returnRate: number;
  }> {
    const events = await this.analyticsRepository.find({
      where: {
        createdAt: Between(startDate, endDate),
      },
    });

    const uniqueUsers = new Set(events.map((event) => event.userId));
    const activeUsers = uniqueUsers.size;

    // Calculate average session time
    const sessionTimes = events
      .map((event) => event.eventData?.timeSpent)
      .filter(
        (timeSpent): timeSpent is number => typeof timeSpent === 'number',
      );

    const averageSessionTime =
      sessionTimes.length > 0
        ? sessionTimes.reduce((sum, time) => sum + time, 0) /
          sessionTimes.length
        : 0;

    // Calculate return rate (users who had sessions on multiple days)
    const userDays: Record<string, Set<string>> = {};
    events.forEach((event) => {
      const userId = event.userId;
      const day = event.createdAt.toISOString().split('T')[0];

      if (!userDays[userId]) {
        userDays[userId] = new Set();
      }
      userDays[userId].add(day);
    });

    const returningUsers = Object.values(userDays).filter(
      (days) => days.size > 1,
    ).length;
    const returnRate =
      activeUsers > 0 ? (returningUsers / activeUsers) * 100 : 0;

    return {
      activeUsers,
      averageSessionTime,
      returnRate,
    };
  }

  private async generateTimeSeriesData(
    startDate: Date,
    endDate: Date,
  ): Promise<Array<{ date: string; events: number; completions: number }>> {
    const events = await this.analyticsRepository.find({
      where: {
        createdAt: Between(startDate, endDate),
      },
    });

    const dailyData: Record<string, { events: number; completions: number }> =
      {};

    events.forEach((event) => {
      const date = event.createdAt.toISOString().split('T')[0];

      if (!dailyData[date]) {
        dailyData[date] = { events: 0, completions: 0 };
      }

      dailyData[date].events++;

      if (event.eventType === AnalyticsEventType.TUTORIAL_COMPLETED) {
        dailyData[date].completions++;
      }
    });

    return Object.entries(dailyData).map(([date, data]) => ({
      date,
      events: data.events,
      completions: data.completions,
    }));
  }

  private getTimeOfDay(hour: number): string {
    if (hour >= 6 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 18) return 'afternoon';
    if (hour >= 18 && hour < 22) return 'evening';
    return 'night';
  }

  private identifyStrugglingAreas(
    errorEvents: TutorialAnalytics[],
    hintEvents: TutorialAnalytics[],
  ): string[] {
    const areas: Record<string, number> = {};
    [...errorEvents, ...hintEvents].forEach((event) => {
      const area = event.eventData?.area || 'unknown';
      areas[area] = (areas[area] || 0) + 1;
    });

    return Object.entries(areas)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([area]) => area);
  }

  private identifyStrengths(completionEvents: TutorialAnalytics[]): string[] {
    const strengths: Record<string, number> = {};

    completionEvents.forEach((event) => {
      const categories = event.eventData?.categories || [];
      categories.forEach((category: string) => {
        strengths[category] = (strengths[category] || 0) + 1;
      });
    });

    return Object.entries(strengths)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([strength]) => strength);
  }
}
