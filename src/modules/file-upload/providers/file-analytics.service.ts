import { Injectable, Logger } from '@nestjs/common';
import { type Repository, Between } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import {
  type FileAnalytics,
  AnalyticsEvent,
} from '../entities/file-analytics.entity';
import type { FileEntity } from '../entities/file.entity';

export interface AnalyticsReport {
  totalEvents: number;
  eventsByType: Record<AnalyticsEvent, number>;
  topFiles: Array<{ fileId: string; fileName: string; eventCount: number }>;
  dailyStats: Array<{ date: string; events: number }>;
  storageUsage: {
    totalSize: number;
    totalFiles: number;
    averageFileSize: number;
  };
}

@Injectable()
export class FileAnalyticsService {
  private readonly logger = new Logger(FileAnalyticsService.name);

  constructor(
    private analyticsRepository: Repository<FileAnalytics>,
    private fileRepository: Repository<FileEntity>,
  ) {}

  async recordEvent(
    fileId: string,
    event: AnalyticsEvent,
    requestInfo?: {
      userAgent?: string;
      ipAddress?: string;
      referrer?: string;
    },
    metadata?: Record<string, any>,
  ): Promise<void> {
    try {
      const analyticsEntry = this.analyticsRepository.create({
        fileId,
        event,
        userAgent: requestInfo?.userAgent,
        ipAddress: requestInfo?.ipAddress,
        referrer: requestInfo?.referrer,
        metadata,
      });

      await this.analyticsRepository.save(analyticsEntry);

      // Update file counters
      if (event === AnalyticsEvent.DOWNLOAD) {
        await this.fileRepository.increment({ id: fileId }, 'downloadCount', 1);
      } else if (event === AnalyticsEvent.VIEW) {
        await this.fileRepository.increment({ id: fileId }, 'viewCount', 1);
      }
    } catch (error) {
      this.logger.error('Failed to record analytics event:', error);
    }
  }

  async getAnalyticsReport(
    userId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<AnalyticsReport> {
    // Get user's files
    const userFiles = await this.fileRepository.find({
      where: { userId },
      select: ['id', 'originalName'],
    });

    const fileIds = userFiles.map((f) => f.id);

    if (fileIds.length === 0) {
      return this.getEmptyReport();
    }

    // Get analytics data
    const analytics = await this.analyticsRepository
      .createQueryBuilder('analytics')
      .where('analytics.fileId IN (:...fileIds)', { fileIds })
      .andWhere('analytics.createdAt BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .getMany();

    // Process analytics data
    const eventsByType: Record<AnalyticsEvent, number> = {} as any;
    Object.values(AnalyticsEvent).forEach((event) => {
      eventsByType[event] = 0;
    });

    const fileEventCounts: Record<string, number> = {};
    const dailyStats: Record<string, number> = {};

    analytics.forEach((entry) => {
      eventsByType[entry.event]++;

      fileEventCounts[entry.fileId] = (fileEventCounts[entry.fileId] || 0) + 1;

      const dateKey = entry.createdAt.toISOString().split('T')[0];
      dailyStats[dateKey] = (dailyStats[dateKey] || 0) + 1;
    });

    // Get top files
    const topFiles = Object.entries(fileEventCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([fileId, eventCount]) => {
        const file = userFiles.find((f) => f.id === fileId);
        return {
          fileId,
          fileName: file?.originalName || 'Unknown',
          eventCount,
        };
      });

    // Get storage usage
    const storageStats = await this.fileRepository
      .createQueryBuilder('file')
      .select('COUNT(*)', 'totalFiles')
      .addSelect('SUM(file.size)', 'totalSize')
      .addSelect('AVG(file.size)', 'averageFileSize')
      .where('file.userId = :userId', { userId })
      .andWhere('file.status = :status', { status: 'ready' })
      .getRawOne();

    return {
      totalEvents: analytics.length,
      eventsByType,
      topFiles,
      dailyStats: Object.entries(dailyStats).map(([date, events]) => ({
        date,
        events,
      })),
      storageUsage: {
        totalSize: Number.parseInt(storageStats.totalSize) || 0,
        totalFiles: Number.parseInt(storageStats.totalFiles) || 0,
        averageFileSize: Number.parseFloat(storageStats.averageFileSize) || 0,
      },
    };
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
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

  private getEmptyReport(): AnalyticsReport {
    const eventsByType: Record<AnalyticsEvent, number> = {} as any;
    Object.values(AnalyticsEvent).forEach((event) => {
      eventsByType[event] = 0;
    });

    return {
      totalEvents: 0,
      eventsByType,
      topFiles: [],
      dailyStats: [],
      storageUsage: {
        totalSize: 0,
        totalFiles: 0,
        averageFileSize: 0,
      },
    };
  }
}
