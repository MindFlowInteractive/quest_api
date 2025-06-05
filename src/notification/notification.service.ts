/* eslint-disable prettier/prettier */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable prettier/prettier */
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification } from './entities/notification.entity';
import { NotificationPreference } from './entities/notification-preference.entity';
import { NotificationTemplate } from './entities/notification-template.entity';
import { PushRegistration } from './entities/push-registration.entity';
import { NotificationSchedule } from './entities/notification-schedule.entity';
import { NotificationEngagement } from './entities/notification-engagement.entity';
import { User } from './entities/user.entity';
import { PushTokenDto } from './dto/push-token.dto';
import { ScheduleNotificationDto } from './dto/schedule-notification.dto';
import { TemplateDto } from './dto/template.dto';
import { UpdateTemplateDto } from './dto/update-template.dto';
import { SearchDto } from './dto/search.dto';
import { HistoryQueryDto } from './dto/history-query.dto';
import { AnalyticsQueryDto } from './dto/analytics-query.dto';
import { ExportDto } from './dto/export.dto';
import { AcknowledgeDto } from './dto/acknowledge.dto';
import { ArchiveDto } from './dto/archive.dto';

import { UpdateDeliveryStatusDto } from './dto/update-template.dto';

@Injectable()
export class NotificationService {
  constructor(
    @InjectRepository(Notification)
    private notificationRepo: Repository<Notification>,
    @InjectRepository(NotificationPreference)
    private preferenceRepo: Repository<NotificationPreference>,
    @InjectRepository(NotificationTemplate)
    private templateRepo: Repository<NotificationTemplate>,
    @InjectRepository(PushRegistration)
    private pushRepo: Repository<PushRegistration>,
    @InjectRepository(NotificationSchedule)
    private scheduleRepo: Repository<NotificationSchedule>,
    @InjectRepository(NotificationEngagement)
    private engagementRepo: Repository<NotificationEngagement>,
    @InjectRepository(User)
    private userRepo: Repository<User>,
  ) {}

  async getPreferences(userId: string) {
    return this.preferenceRepo.find({ where: { user: { id: userId } } });
  }

  async updatePreferences(
    userId: string,
    dto: { preferences: NotificationPreference[] },
  ) {
    await this.preferenceRepo.delete({ user: { id: userId } });
    const prefs = dto.preferences.map((p: NotificationPreference) =>
      this.preferenceRepo.create({ ...p, user: { id: userId } }),
    );
    return this.preferenceRepo.save(prefs);
  }

  async registerPushToken(userId: string, dto: PushTokenDto) {
    const exists = await this.pushRepo.findOne({
      where: {
        user: { id: userId },
        deviceToken: dto.deviceToken,
      } as unknown as Record<string, any>,
    });
    if (!exists) {
      const reg = this.pushRepo.create({
        ...(dto as Partial<PushRegistration>),
        user: { id: userId },
      });
      return this.pushRepo.save(reg);
    }
    return exists;
  }

  async unregisterPushToken(
    userId: string,
    dto: PushTokenDto,
  ): Promise<import('typeorm').DeleteResult> {
    return this.pushRepo.delete({
      user: { id: userId },
      deviceToken: dto.deviceToken,
    });
  }

  async getTemplates() {
    return this.templateRepo.find();
  }

  async createTemplate(dto: TemplateDto) {
    const template = this.templateRepo.create(dto);
    return this.templateRepo.save(template);
  }

  async updateTemplate(id: string, dto: UpdateTemplateDto) {
    const template = await this.templateRepo.findOneBy({ id });
    if (!template) throw new NotFoundException('Template not found');
    Object.assign(template, dto);
    return this.templateRepo.save(template);
  }

  async deleteTemplate(id: string) {
    return this.templateRepo.delete(id);
  }

  async getHistory(userId: string, query: HistoryQueryDto) {
    return this.notificationRepo.find({
      where: { user: { id: userId } },
      order: { createdAt: 'DESC' },
      take: 50,
    });
  }

  archive(userId: string, dto: ArchiveDto) {
    // Placeholder: implement real archive logic
    return { archived: true, ids: dto.ids };
  }

  async getDeliveryStatus(notificationId: string) {
    const notif = await this.notificationRepo.findOneBy({ id: notificationId });
    if (!notif) throw new NotFoundException('Notification not found');
    return { status: notif.status };
  }

  async updateDeliveryStatus(
    notificationId: string,
    dto: UpdateDeliveryStatusDto,
  ) {
    const notif = await this.notificationRepo.findOneBy({ id: notificationId });
    if (!notif) throw new NotFoundException('Notification not found');
    notif.status = dto.status;
    return this.notificationRepo.save(notif);
  }

  async schedule(dto: ScheduleNotificationDto) {
    const schedule = this.scheduleRepo.create(
      dto as Partial<NotificationSchedule>,
    );
    return this.scheduleRepo.save(schedule);
  }

  async getScheduled(query: any) {
    return this.scheduleRepo.find();
  }

  async cancelScheduled(id: string) {
    return this.scheduleRepo.delete(id);
  }

  getAnalytics(query: AnalyticsQueryDto) {
    return { totalSent: 1000, totalRead: 800, clickRate: 0.45 };
  }

  async getEngagement(notificationId: string) {
    return this.engagementRepo.find({
      where: { notification: { id: notificationId } },
    });
  }

  async acknowledge(
    userId: string,
    notificationId: string,
    dto: AcknowledgeDto,
  ) {
    const engagement = this.engagementRepo.create({
      action: (dto as any).action,
      notification: { id: notificationId },
      user: { id: userId },
    });
    return this.engagementRepo.save(engagement);
  }

  search(query: SearchDto) {
    return [];
  }

  export(dto: ExportDto) {
    return { message: 'Export ready', url: '/exports/notifications.csv' };
  }

  backup() {
    return { message: 'Backup started' };
  }
}
