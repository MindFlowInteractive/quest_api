/* eslint-disable prettier/prettier */
import { IsNumber } from 'class-validator';

export class AcknowledgeDto {
  @IsNumber()
  notificationId: number;
}
