import { IsString, IsEnum, IsNumber, IsBoolean, IsOptional, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AchievementType, AchievementRarity } from '../entities/achievement.entity';

export class CreateAchievementDto {
  @ApiProperty({
    description: 'Name of the achievement',
    example: 'Puzzle Master',
  })
  @IsString()
  name: string;

  @ApiProperty({
    description: 'Description of what the achievement entails',
    example: 'Solve 100 puzzles in expert mode',
  })
  @IsString()
  description: string;

  @ApiPropertyOptional({
    description: 'Hint to help users unlock the achievement',
    example: 'Try beating expert levels quickly!',
  })
  @IsOptional()
  @IsString()
  hint?: string;

  @ApiProperty({
    enum: AchievementType,
    description: 'Type of the achievement (e.g., story, challenge)',
    example: AchievementType.CHALLENGE,
  })
  @IsEnum(AchievementType)
  type: AchievementType;

  @ApiPropertyOptional({
    enum: AchievementRarity,
    description: 'Rarity level of the achievement',
    example: AchievementRarity.RARE,
  })
  @IsOptional()
  @IsEnum(AchievementRarity)
  rarity?: AchievementRarity;

  @ApiProperty({
    description: 'URL or name of the achievement icon',
    example: 'trophy_gold.png',
  })
  @IsString()
  icon: string;

  @ApiProperty({
    description: 'Criteria for unlocking the achievement',
    example: { puzzlesSolved: 100 },
    type: Object,
  })
  @IsObject()
  criteria: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Points awarded when achievement is unlocked',
    example: 50,
  })
  @IsOptional()
  @IsNumber()
  points?: number;

  @ApiPropertyOptional({
    description: 'Whether the achievement is currently active',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({
    description: 'Whether the achievement is hidden from users',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  isHidden?: boolean;

  @ApiPropertyOptional({
    description: 'If true, applies retroactively based on past user actions',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  isRetroactive?: boolean;

  @ApiPropertyOptional({
    description: 'Additional metadata for internal use',
    example: { featured: true, category: 'milestone' },
    type: Object,
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
