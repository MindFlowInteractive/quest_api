/* eslint-disable prettier/prettier */
import { IsOptional, IsDateString } from 'class-validator';

export class ExportDto {
  @IsOptional()
  @IsDateString()
  fromDate?: string;

  @IsOptional()
  @IsDateString()
  toDate?: string;
}
