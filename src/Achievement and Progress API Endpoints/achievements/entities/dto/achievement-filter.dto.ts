import { IsOptional, IsEnum, IsBoolean, IsString } from 'class-validator';
import { AchievementType, AchievementRarity } from '../entities/achievement.entity';
import { ProgressStatus } from '../entities/user-achievement.entity';

export class AchievementFilterDto {
  @IsOptional()
  @IsEnum(AchievementType)
  type?: AchievementType;

  @IsOptional()
  @IsEnum(AchievementRarity)
  rarity?: AchievementRarity;

  @IsOptional()
  @IsEnum(ProgressStatus)
  status?: ProgressStatus;

  @IsOptional()
  @IsBoolean()
  isHidden?: boolean;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  sortBy?: string;

  @IsOptional()
  @IsString()
  sortOrder?: 'ASC' | 'DESC';
}
