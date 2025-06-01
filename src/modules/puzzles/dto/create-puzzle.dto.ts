import {
  IsString,
  IsEnum,
  IsOptional,
  IsArray,
  IsObject,
  ValidateNested,
  IsNumber,
  Min,
  Max,
  IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PuzzleStatus, PuzzleDifficulty } from '../entities/puzzle.entity';

export class CreatePuzzleDto {
  @IsString()
  title: string;

  @IsString()
  description: string;

  @IsString()
  content: string;

  @IsEnum(PuzzleStatus)
  @IsOptional()
  status?: PuzzleStatus;

  @IsEnum(PuzzleDifficulty)
  @IsOptional()
  difficulty?: PuzzleDifficulty;

  @IsObject()
  @IsOptional()
  @ValidateNested()
  @Type(() => PuzzleMetadataDto)
  metadata?: PuzzleMetadataDto;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  categoryIds?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tagIds?: string[];

  @IsBoolean()
  @IsOptional()
  isPublic?: boolean;
}

export class PuzzleMetadataDto {
  @IsNumber()
  @Min(1)
  @Max(1440)
  estimatedTime: number;

  @IsArray()
  @IsString({ each: true })
  requiredSkills: string[];

  @IsArray()
  @IsString({ each: true })
  learningObjectives: string[];

  @IsArray()
  @IsString({ each: true })
  prerequisites: string[];

  @IsArray()
  @IsString({ each: true })
  hints: string[];

  @IsString()
  solution: string;

  @IsObject()
  @IsOptional()
  customFields?: Record<string, any>;
}
