import { IsOptional, IsEnum, IsBoolean } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  AchievementType,
  AchievementRarity,
} from '../entities/achievement.entity';

export class AchievementFilterDto {
  @ApiPropertyOptional({ description: 'Filter by achievement type' })
  @IsOptional()
  @IsEnum(AchievementType)
  type?: AchievementType;

  @ApiPropertyOptional({ description: 'Filter by achievement rarity' })
  @IsOptional()
  @IsEnum(AchievementRarity)
  rarity?: AchievementRarity;

  @ApiPropertyOptional({ description: 'Filter by unlocked status' })
  @IsOptional()
  @Transform(({ value }) => value === 'true')
  @IsBoolean()
  unlocked?: boolean;

  @ApiPropertyOptional({ description: 'Show only active achievements' })
  @IsOptional()
  @Transform(({ value }) => value === 'true')
  @IsBoolean()
  activeOnly?: boolean = true;
}
