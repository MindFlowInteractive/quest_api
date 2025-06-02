import { NotificationCategory } from '@/common/enums/notification.enum';
import {
  IsBoolean,
  IsOptional,
  IsObject,
  IsString,
  IsInt,
  Min,
  Max,
} from 'class-validator';

export class UpdatePreferencesDto {
  @IsOptional()
  @IsBoolean()
  inAppEnabled?: boolean;

  @IsOptional()
  @IsObject()
  inAppCategories?: Record<NotificationCategory, boolean>;

  @IsOptional()
  @IsBoolean()
  pushEnabled?: boolean;

  @IsOptional()
  @IsObject()
  pushCategories?: Record<NotificationCategory, boolean>;

  @IsOptional()
  @IsBoolean()
  emailEnabled?: boolean;

  @IsOptional()
  @IsObject()
  emailCategories?: Record<NotificationCategory, boolean>;

  @IsOptional()
  @IsBoolean()
  smsEnabled?: boolean;

  @IsOptional()
  @IsObject()
  smsCategories?: Record<NotificationCategory, boolean>;

  @IsOptional()
  @IsString()
  quietHoursStart?: string;

  @IsOptional()
  @IsString()
  quietHoursEnd?: string;

  @IsOptional()
  @IsString()
  timezone?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(50)
  maxDailyNotifications?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10)
  maxHourlyNotifications?: number;
}
