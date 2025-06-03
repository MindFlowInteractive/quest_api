import {
  IsOptional,
  IsEnum,
  IsDateString,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { SkillLevel } from '../entities/user-progress.entity';

export class ProgressFilterDto {
  @ApiPropertyOptional({ description: 'Filter by skill level' })
  @IsOptional()
  @IsEnum(SkillLevel)
  skillLevel?: SkillLevel;

  @ApiPropertyOptional({ description: 'Filter by minimum experience points' })
  @IsOptional()
  @IsInt()
  @Min(0)
  minExperiencePoints?: number;

  @ApiPropertyOptional({ description: 'Filter by maximum experience points' })
  @IsOptional()
  @IsInt()
  @Min(0)
  maxExperiencePoints?: number;

  @ApiPropertyOptional({ description: 'Filter by minimum level' })
  @IsOptional()
  @IsInt()
  @Min(1)
  minLevel?: number;

  @ApiPropertyOptional({ description: 'Filter by maximum level' })
  @IsOptional()
  @IsInt()
  @Min(1)
  maxLevel?: number;

  @ApiPropertyOptional({ description: 'Filter users active since date' })
  @IsOptional()
  @IsDateString()
  activeSince?: string;

  @ApiPropertyOptional({ description: 'Page number', default: 1 })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Items per page', default: 20 })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}
