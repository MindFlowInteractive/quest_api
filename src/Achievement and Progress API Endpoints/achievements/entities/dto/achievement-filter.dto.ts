import { IsOptional, IsEnum, IsBoolean, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { AchievementType, AchievementRarity } from '../entities/achievement.entity';
import { ProgressStatus } from '../entities/user-achievement.entity';

export class AchievementFilterDto {
  @ApiPropertyOptional({
    enum: AchievementType,
    description: 'Filter by type of achievement (e.g. story, challenge, etc.)',
  })
  @IsOptional()
  @IsEnum(AchievementType)
  type?: AchievementType;

  @ApiPropertyOptional({
    enum: AchievementRarity,
    description: 'Filter by rarity (e.g. common, rare, legendary)',
  })
  @IsOptional()
  @IsEnum(AchievementRarity)
  rarity?: AchievementRarity;

  @ApiPropertyOptional({
    enum: ProgressStatus,
    description: 'Filter by progress status (e.g. locked, in_progress, completed)',
  })
  @IsOptional()
  @IsEnum(ProgressStatus)
  status?: ProgressStatus;

  @ApiPropertyOptional({
    type: Boolean,
    description: 'Whether to include hidden achievements',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  isHidden?: boolean;

  @ApiPropertyOptional({
    description: 'Search term to filter by title or description',
    example: 'Explorer',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Field to sort by (e.g. createdAt, name)',
    example: 'createdAt',
  })
  @IsOptional()
  @IsString()
  sortBy?: string;

  @ApiPropertyOptional({
    description: 'Sorting order: ASC or DESC',
    example: 'DESC',
  })
  @IsOptional()
  @IsString()
  sortOrder?: 'ASC' | 'DESC';
}
