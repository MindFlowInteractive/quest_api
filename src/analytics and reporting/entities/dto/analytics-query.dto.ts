import { IsOptional, IsDateString, IsString, IsNumber, IsArray, Min, Max } from 'class-validator';
import { Transform, Type } from 'class-transformer';

export class AnalyticsQueryDto {
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsString()
  playerId?: string;

  @IsOptional()
  @IsArray()
  @Transform(({ value }) => Array.isArray(value) ? value : [value])
  playerIds?: string[];

  @IsOptional()
  @IsString()
  platform?: string;

  @IsOptional()
  @IsString()
  deviceType?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(1000)
  limit?: number = 100;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  offset?: number = 0;
}

export class PlayerBehaviorQueryDto extends AnalyticsQueryDto {
  @IsOptional()
  @IsString()
  eventType?: string;

  @IsOptional()
  @IsString()
  sessionId?: string;
}

export class PuzzleAnalyticsQueryDto extends AnalyticsQueryDto {
  @IsOptional()
  @IsString()
  puzzleId?: string;

  @IsOptional()
  @IsString()
  difficulty?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  minScore?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  maxScore?: number;
}

export class RevenueQueryDto extends AnalyticsQueryDto {
  @IsOptional()
  @IsString()
  productType?: string;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  minAmount?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  maxAmount?: number;
}
