import { IsEnum, IsBoolean, IsOptional, IsObject } from 'class-validator';
import { Theme, Language } from '../entities/user-preferences.entity';

export class UpdateUserPreferencesDto {
  @IsOptional()
  @IsEnum(Theme)
  theme?: Theme;

  @IsOptional()
  @IsEnum(Language)
  language?: Language;

  @IsOptional()
  @IsBoolean()
  emailNotifications?: boolean;

  @IsOptional()
  @IsBoolean()
  pushNotifications?: boolean;

  @IsOptional()
  @IsBoolean()
  smsNotifications?: boolean;

  @IsOptional()
  @IsBoolean()
  marketingEmails?: boolean;

  @IsOptional()
  @IsBoolean()
  profileVisibility?: boolean;

  @IsOptional()
  @IsBoolean()
  showOnlineStatus?: boolean;

  @IsOptional()
  @IsBoolean()
  allowFriendRequests?: boolean;

  @IsOptional()
  @IsObject()
  privacySettings?: Record<string, any>;
}
