import { IsString, IsEnum, IsNumber, IsBoolean, IsOptional, IsObject } from 'class-validator';
import { AchievementType, AchievementRarity } from '../entities/achievement.entity';

export class CreateAchievementDto {
  @IsString()
  name: string;

  @IsString()
  description: string;

  @IsOptional()
  @IsString()
  hint?: string;

  @IsEnum(AchievementType)
  type: AchievementType;

  @IsOptional()
  @IsEnum(AchievementRarity)
  rarity?: AchievementRarity;

  @IsString()
  icon: string;

  @IsObject()
  criteria: Record<string, any>;

  @IsOptional()
  @IsNumber()
  points?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsBoolean()
  isHidden?: boolean;

  @IsOptional()
  @IsBoolean()
  isRetroactive?: boolean;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
