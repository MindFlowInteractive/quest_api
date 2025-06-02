import {
  IsArray,
  IsOptional,
  IsString,
  IsEnum,
  IsObject,
  IsDateString,
} from 'class-validator';
import {
  NotificationCategory,
  NotificationPriority,
  NotificationType,
} from '@/common/enums/notification.enum';

export class BulkNotificationDto {
  @IsArray()
  @IsString({ each: true })
  userIds: string[];

  @IsEnum(NotificationType)
  type: NotificationType;

  @IsEnum(NotificationCategory)
  category: NotificationCategory;

  @IsString()
  title: string;

  @IsString()
  message: string;

  @IsOptional()
  @IsObject()
  data?: Record<string, any>;

  @IsOptional()
  @IsString()
  imageUrl?: string;

  @IsOptional()
  @IsString()
  actionUrl?: string;

  @IsOptional()
  @IsDateString()
  scheduledAt?: Date;

  @IsOptional()
  @IsEnum(NotificationPriority)
  priority?: NotificationPriority;

  @IsOptional()
  @IsString()
  campaignId?: string;

  @IsOptional()
  @IsString()
  templateName?: string;

  @IsOptional()
  @IsObject()
  templateVariables?: Record<string, any>;
}
