/* eslint-disable prettier/prettier */
import { IsNumber, IsString } from 'class-validator';

export class StatusUpdateDto {
  @IsNumber()
  notificationId: number;

  @IsString()
  status: string;
}
