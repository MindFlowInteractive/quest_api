/* eslint-disable prettier/prettier */
import { IsOptional, IsNumber } from 'class-validator';

export class HistoryQueryDto {
  @IsOptional()
  @IsNumber()
  userId?: number;
}
