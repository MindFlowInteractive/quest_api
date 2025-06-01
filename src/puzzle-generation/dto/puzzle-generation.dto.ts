import { 
  IsEnum, 
  IsNumber, 
  IsOptional, 
  IsString, 
  IsObject, 
  Min, 
  Max, 
  IsDateString 
} from 'class-validator';
import { Type } from 'class-transformer';
import { PuzzleType } from '../interfaces/puzzle.interface';

export class GeneratePuzzleDto {
  @IsEnum(PuzzleType)
  type: PuzzleType;

  @IsNumber()
  @Min(1)
  @Max(10)
  difficulty: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  size?: number;

  @IsOptional()
  @IsObject()
  constraints?: any;

  @IsOptional()
  @IsString()
  theme?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  timeLimit?: number;
}

export class AnalyticsQueryDto {
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;
}