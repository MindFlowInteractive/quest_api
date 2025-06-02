import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, MoreThan } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Notification } from '../entities/notification.entity';
import {
  NotificationType,
  NotificationPriority,
  NotificationCategory,
  NotificationStatus,
} from '@/common/enums/notification.enum';
import { DeviceToken } from '../entities/device-token.entity';
import { NotificationPreference } from '../entities/notification-preference.entity';
import { NotificationTemplate } from '../entities/notification-template.entity';
import { NotificationAnalyticsService } from './notification-analytics.service';
import { EmailNotificationService } from './email-notification.service';
import { PushNotificationService } from './push-notification.service';

export interface CreateNotificationDto {
  userId: string;
  type: NotificationType;
  category: NotificationCategory;
  title: string;
  message: string;
  data?: Record<string, any>;
  imageUrl?: string;
  actionUrl?: string;
  scheduledAt?: Date;
  priority?: NotificationPriority;
  campaignId?: string;
  templateName?: string;
  templateVariables?: Record<string, any>;
}

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    @InjectRepository(Notification)
    private notificationRepository: Repository<Notification>,

    @InjectRepository(NotificationPreference)
    private preferenceRepository: Repository<NotificationPreference>,

    @InjectRepository(NotificationTemplate)
    private templateRepository: Repository<NotificationTemplate>,

    @InjectRepository(DeviceToken)
    private deviceTokenRepository: Repository<DeviceToken>,

    private pushNotificationService: PushNotificationService,

    private emailNotificationService: EmailNotificationService,

    private analyticsService: NotificationAnalyticsService,
  ) {}

  public async createNotification(
    dto: CreateNotificationDto,
  ): Promise<Notification | null> {
    // Check user preferences
    const canSend = await this.checkUserPreferences(
      dto.userId,
      dto.type,
      dto.category,
    );
    if (!canSend) {
      this.logger.debug(
        `Notification blocked by user preferences: ${dto.userId}`,
      );
      return null;
    }

    // Check rate limits
    const withinLimits = await this.checkRateLimits(dto.userId);
    if (!withinLimits) {
      this.logger.debug(`Rate limit exceeded for user: ${dto.userId}`);
      return null;
    }

    // Use template if specified
    let title = dto.title;
    let message = dto.message;

    if (dto.templateName) {
      const processedTemplate = await this.processTemplate(
        dto.templateName,
        dto.templateVariables || {},
      );
      if (processedTemplate) {
        title = processedTemplate.title;
        message = processedTemplate.message;
      }
    }

    const notification = this.notificationRepository.create({
      ...dto,
      title,
      message,
      status: dto.scheduledAt
        ? NotificationStatus.PENDING
        : NotificationStatus.PENDING,
    });

    const savedNotification =
      await this.notificationRepository.save(notification);

    // Send immediately if not scheduled
    if (!dto.scheduledAt) {
      await this.sendNotification(savedNotification.id);
    }

    return savedNotification;
  }

  public async sendNotification(notificationId: string): Promise<boolean> {
    const notification = await this.notificationRepository.findOne({
      where: { id: notificationId, status: NotificationStatus.PENDING },
      relations: ['user'],
    });

    if (!notification) {
      this.logger.warn(
        `Notification not found or already processed: ${notificationId}`,
      );
      return false;
    }

    try {
      let success = false;

      switch (notification.type) {
        case NotificationType.IN_APP:
          success = await this.sendInAppNotification(notification);
          break;
        case NotificationType.PUSH:
          success = await this.sendPushNotification(notification);
          break;
        case NotificationType.EMAIL:
          success = await this.sendEmailNotification(notification);
          break;
      }

      if (success) {
        await this.updateNotificationStatus(
          notificationId,
          NotificationStatus.SENT,
        );
        await this.analyticsService.recordSent(notification);
      } else {
        await this.handleNotificationFailure(notificationId, 'Send failed');
      }

      return success;
    } catch (error) {
      this.logger.error(
        `Failed to send notification ${notificationId}:`,
        error,
      );
      await this.handleNotificationFailure(notificationId, error.message);
      return false;
    }
  }

  private async sendInAppNotification(
    notification: Notification,
  ): Promise<boolean> {
    // In-app notifications are just stored in database and marked as delivered
    await this.updateNotificationStatus(
      notification.id,
      NotificationStatus.DELIVERED,
    );
    return true;
  }

  private async sendPushNotification(
    notification: Notification,
  ): Promise<boolean> {
    const deviceTokens = await this.deviceTokenRepository.find({
      where: { userId: notification.userId, isActive: true },
    });

    if (deviceTokens.length === 0) {
      this.logger.debug(
        `No active device tokens for user: ${notification.userId}`,
      );
      return false;
    }

    const pushPayload = {
      title: notification.title,
      body: notification.message,
      data: notification.data || {},
      imageUrl: notification.imageUrl,
      actionUrl: notification.actionUrl,
    };

    let successCount = 0;
    const tokens = deviceTokens.map((dt) => dt.token);

    try {
      const results = await this.pushNotificationService.sendToTokens(
        tokens,
        pushPayload,
      );
      successCount = results.successCount;

      // Handle invalid tokens
      if (results.invalidTokens.length > 0) {
        await this.handleInvalidTokens(results.invalidTokens);
      }
    } catch (error) {
      this.logger.error('Push notification failed:', error);
      return false;
    }

    return successCount > 0;
  }

  private async sendEmailNotification(
    notification: Notification,
  ): Promise<boolean> {
    if (!notification.user?.email) {
      this.logger.debug(`No email address for user: ${notification.userId}`);
      return false;
    }

    const emailPayload = {
      to: notification.user.email,
      subject: notification.title,
      html: this.generateEmailHtml(notification),
      text: notification.message,
    };

    return await this.emailNotificationService.sendEmail(emailPayload);
  }

  private generateEmailHtml(notification: Notification): string {
    // Basic HTML template - you can enhance this
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>${notification.title}</h2>
        <p>${notification.message}</p>
        ${notification.imageUrl ? `<img src="${notification.imageUrl}" alt="Notification" style="max-width: 100%;">` : ''}
        ${notification.actionUrl ? `<a href="${notification.actionUrl}" style="background: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; margin-top: 20px;">View Details</a>` : ''}
      </div>
    `;
  }

  public async markAsRead(
    notificationId: string,
    userId: string,
  ): Promise<boolean> {
    const result = await this.notificationRepository.update(
      {
        id: notificationId,
        userId,
        status: NotificationStatus.DELIVERED,
      },
      {
        status: NotificationStatus.READ,
        readAt: new Date(),
      },
    );

    if ((result.affected ?? 0) > 0) {
      await this.analyticsService.recordOpened(notificationId);
      return true;
    }

    return false;
  }

  public async markAsClicked(
    notificationId: string,
    userId: string,
  ): Promise<boolean> {
    const notification = await this.notificationRepository.findOne({
      where: { id: notificationId, userId },
    });

    if (notification) {
      await this.analyticsService.recordClicked(notificationId);
      return true;
    }

    return false;
  }

  public async getUserNotifications(
    userId: string,
    page = 1,
    limit = 20,
  ): Promise<{
    notifications: Notification[];
    total: number;
    unreadCount: number;
  }> {
    const [notifications, total] =
      await this.notificationRepository.findAndCount({
        where: { userId, type: NotificationType.IN_APP },
        order: { createdAt: 'DESC' },
        skip: (page - 1) * limit,
        take: limit,
      });

    const unreadCount = await this.notificationRepository.count({
      where: {
        userId,
        type: NotificationType.IN_APP,
        status: NotificationStatus.DELIVERED,
      },
    });

    return { notifications, total, unreadCount };
  }

  private async checkUserPreferences(
    userId: string,
    type: NotificationType,
    category: NotificationCategory,
  ): Promise<boolean> {
    const preferences = await this.preferenceRepository.findOne({
      where: { userId },
    });

    if (!preferences) {
      return true; // Default to allow if no preferences set
    }

    // Check if the notification type is enabled
    switch (type) {
      case NotificationType.IN_APP:
        if (!preferences.inAppEnabled) return false;
        return preferences.inAppCategories[category] !== false;
      case NotificationType.PUSH:
        if (!preferences.pushEnabled) return false;
        return preferences.pushCategories[category] !== false;
      case NotificationType.EMAIL:
        if (!preferences.emailEnabled) return false;
        return preferences.emailCategories[category] !== false;
      case NotificationType.SMS:
        if (!preferences.smsEnabled) return false;
        return preferences.smsCategories[category] !== false;
    }

    return true;
  }

  private async checkRateLimits(userId: string): Promise<boolean> {
    const preferences = await this.preferenceRepository.findOne({
      where: { userId },
    });

    if (!preferences) return true;

    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Check hourly limit
    const hourlyCount = await this.notificationRepository.count({
      where: {
        userId,
        sentAt: MoreThan(oneHourAgo),
      },
    });

    if (hourlyCount >= preferences.maxHourlyNotifications) {
      return false;
    }

    // Check daily limit
    const dailyCount = await this.notificationRepository.count({
      where: {
        userId,
        sentAt: MoreThan(oneDayAgo),
      },
    });

    return dailyCount < preferences.maxDailyNotifications;
  }

  private async processTemplate(
    templateName: string,
    variables: Record<string, any>,
  ): Promise<{ title: string; message: string } | null> {
    const template = await this.templateRepository.findOne({
      where: { name: templateName, isActive: true },
    });

    if (!template) return null;

    let title = template.title;
    let message = template.message;

    // Replace variables in template
    Object.entries(variables).forEach(([key, value]) => {
      const placeholder = `{{${key}}}`;
      title = title.replace(new RegExp(placeholder, 'g'), String(value));
      message = message.replace(new RegExp(placeholder, 'g'), String(value));
    });

    return { title, message };
  }

  private async updateNotificationStatus(
    notificationId: string,
    status: NotificationStatus,
  ): Promise<void> {
    const updateData: any = { status };

    if (status === NotificationStatus.SENT) {
      updateData.sentAt = new Date();
    } else if (status === NotificationStatus.DELIVERED) {
      updateData.deliveredAt = new Date();
    }

    await this.notificationRepository.update(notificationId, updateData);
  }

  private async handleNotificationFailure(
    notificationId: string,
    errorMessage: string,
  ): Promise<void> {
    await this.notificationRepository.update(notificationId, {
      status: NotificationStatus.FAILED,
      errorMessage,
      retryCount: () => 'retryCount + 1',
    });

    await this.analyticsService.recordFailed(notificationId);
  }

  private async handleInvalidTokens(invalidTokens: string[]): Promise<void> {
    for (const token of invalidTokens) {
      await this.deviceTokenRepository.update({ token }, { isActive: false });
    }
  }

  // Scheduled job to send pending notifications
  @Cron(CronExpression.EVERY_MINUTE)
  public async processPendingNotifications(): Promise<void> {
    const pendingNotifications = await this.notificationRepository.find({
      where: {
        status: NotificationStatus.PENDING,
        scheduledAt: Between(new Date(0), new Date()),
      },
      take: 100, // Process in batches
    });

    for (const notification of pendingNotifications) {
      await this.sendNotification(notification.id);
    }
  }

  // Scheduled job to retry failed notifications
  @Cron(CronExpression.EVERY_5_MINUTES)
  public async retryFailedNotifications(): Promise<void> {
    const failedNotifications = await this.notificationRepository.find({
      where: {
        status: NotificationStatus.FAILED,
        retryCount: Between(0, 2), // Max 3 retries
      },
      take: 50,
    });

    for (const notification of failedNotifications) {
      this.logger.debug(`Retrying notification: ${notification.id}`);
      await this.sendNotification(notification.id);
    }
  }
}
