/* eslint-disable prettier/prettier */
import { IsDateString, IsNumber } from 'class-validator';

export class ScheduleNotificationDto {
  @IsNumber()
  notificationId: number;

  @IsDateString()
  scheduledFor: string;
}
