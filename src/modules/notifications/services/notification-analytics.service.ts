import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotificationAnalytics } from '../entities/notification-analytics.entity';
import { Notification} from '../entities/notification.entity';
import { NotificationCategory, NotificationType } from '@/common/enums/notification.enum';


@Injectable()
export class NotificationAnalyticsService {
  private readonly logger = new Logger(NotificationAnalyticsService.name);

  constructor(
    @InjectRepository(NotificationAnalytics)
    private analyticsRepository: Repository<NotificationAnalytics>,
    @InjectRepository(Notification)
    private notificationRepository: Repository<Notification>,
  ) {}

  async recordSent(notification: Notification): Promise<void> {
    await this.updateDailyStats(
      notification.category,
      notification.type,
      notification.campaignId,
      { sent: 1 }
    );
  }

  async recordDelivered(notificationId: string): Promise<void> {
    const notification = await this.notificationRepository.findOne({
      where: { id: notificationId },
    });

    if (notification) {
      await this.updateDailyStats(
        notification.category,
        notification.type,
        notification.campaignId,
        { delivered: 1 }
      );
    }
  }

  async recordOpened(notificationId: string): Promise<void> {
    const notification = await this.notificationRepository.findOne({
      where: { id: notificationId },
    });

    if (notification) {
      await this.updateDailyStats(
        notification.category,
        notification.type,
        notification.campaignId,
        { opened: 1 }
      );
    }
  }

  async recordClicked(notificationId: string): Promise<void> {
    const notification = await this.notificationRepository.findOne({
      where: { id: notificationId },
    });

    if (notification) {
      await this.updateDailyStats(
        notification.category,
        notification.type,
        notification.campaignId,
        { clicked: 1 }
      );
    }
  }

  async recordFailed(notificationId: string): Promise<void> {
    const notification = await this.notificationRepository.findOne({
      where: { id: notificationId },
    });

    if (notification) {
      await this.updateDailyStats(
        notification.category,
        notification.type,
        notification.campaignId,
        { failed: 1 }
      );
    }
  }

  private async updateDailyStats(
    category: NotificationCategory,
    type: NotificationType,
    campaignId: string | null,
    updates: Partial<{
      sent: number;
      delivered: number;
      opened: number;
      clicked: number;
      failed: number;
    }>
  ): Promise<void> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let analytics = await this.analyticsRepository.findOne({
      where: {
        date: today,
        category,
        type,
        campaignId: campaignId ?? undefined,
      },
    });

    if (!analytics) {
      analytics = this.analyticsRepository.create({
        date: today,
        category,
        type,
        campaignId: campaignId ?? undefined,
        sent: 0,
        delivered: 0,
        opened: 0,
        clicked: 0,
        failed: 0,
      });
    }

    // Update counters
    (Object.entries(updates) as [keyof Pick<NotificationAnalytics, 'sent' | 'delivered' | 'opened' | 'clicked' | 'failed'>, number][]).forEach(([key, value]) => {
      analytics[key] = (analytics[key] ?? 0) + value;
    });

    // Calculate rates
    if (analytics.sent > 0) {
      analytics.deliveryRate = (analytics.delivered / analytics.sent) * 100;
      analytics.openRate = (analytics.opened / analytics.sent) * 100;
      analytics.clickRate = (analytics.clicked / analytics.sent) * 100;
    }

    await this.analyticsRepository.save(analytics);
  }

  async getAnalytics(
    startDate: Date,
    endDate: Date,
    category?: NotificationCategory,
    type?: NotificationType,
    campaignId?: string
  ): Promise<NotificationAnalytics[]> {
    const query = this.analyticsRepository.createQueryBuilder('analytics')
      .where('analytics.date BETWEEN :startDate AND :endDate', { startDate, endDate });

    if (category) {
      query.andWhere('analytics.category = :category', { category });
    }

    if (type) {
      query.andWhere('analytics.type = :type', { type });
    }

    if (campaignId) {
      query.andWhere('analytics.campaignId = :campaignId', { campaignId });
    }

    return query.orderBy('analytics.date', 'ASC').getMany();
  }

  async getOverallStats(days = 30): Promise<{
    totalSent: number;
    totalDelivered: number;
    totalOpened: number;
    totalClicked: number;
    averageDeliveryRate: number;
    averageOpenRate: number;
    averageClickRate: number;
  }> {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - days);

    const analytics = await this.getAnalytics(startDate, endDate);

    const totals = analytics.reduce(
      (acc, curr) => ({
        totalSent: acc.totalSent + curr.sent,
        totalDelivered: acc.totalDelivered + curr.delivered,
        totalOpened: acc.totalOpened + curr.opened,
        totalClicked: acc.totalClicked + curr.clicked,
      }),
      { totalSent: 0, totalDelivered: 0, totalOpened: 0, totalClicked: 0 }
    );

    return {
      ...totals,
      averageDeliveryRate: totals.totalSent > 0 ? (totals.totalDelivered / totals.totalSent) * 100 : 0,
      averageOpenRate: totals.totalSent > 0 ? (totals.totalOpened / totals.totalSent) * 100 : 0,
      averageClickRate: totals.totalSent > 0 ? (totals.totalClicked / totals.totalSent) * 100 : 0,
    };
  }
}