/* eslint-disable prettier/prettier */
import { IsBoolean, IsString } from 'class-validator';

export class NotificationPreferencesDto {
  @IsString()
  type: string;

  @IsBoolean()
  enabled: boolean;
}
