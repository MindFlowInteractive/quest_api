/* eslint-disable prettier/prettier */
import { Injectable } from '@nestjs/common';
import {
  NotificationPreferencesDto,
  PushTokenDto,
  ScheduleNotificationDto,
  TemplateDto,
  UpdateTemplateDto,
  SearchDto,
  HistoryQueryDto,
  AnalyticsQueryDto,
  ExportDto,
} from './dto';

@Injectable()
export class NotificationRepository {
  acknowledge(id: number) {
    return { message: `Acknowledged notification ${id}` };
  }

  archive(ids: number[]) {
    return { message: `Archived notifications`, ids };
  }

  updatePreferences(dto: NotificationPreferencesDto) {
    return { message: 'Updated preferences', dto };
  }

  registerPushToken(dto: PushTokenDto) {
    return { message: 'Registered push token', dto };
  }

  schedule(dto: ScheduleNotificationDto) {
    return { message: 'Scheduled notification', dto };
  }

  createTemplate(dto: TemplateDto) {
    return { message: 'Created template', dto };
  }

  updateTemplate(dto: UpdateTemplateDto) {
    return { message: 'Updated template', dto };
  }

  search(dto: SearchDto) {
    return { message: 'Searched notifications', dto };
  }

  getHistory(dto: HistoryQueryDto): { message: string; dto: HistoryQueryDto } {
    return { message: 'Fetched notification history', dto: dto };
  }

  getAnalytics(dto: AnalyticsQueryDto): {
    message: string;
    dto: AnalyticsQueryDto;
  } {
    return { message: 'Fetched analytics', dto };
  }

  export(dto: ExportDto): { message: string; dto: ExportDto } {
    return { message: 'Exported notifications', dto };
  }
}
