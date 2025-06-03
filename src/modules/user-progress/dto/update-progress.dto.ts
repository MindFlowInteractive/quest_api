import { IsOptional, IsInt, IsEnum, IsObject } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { SkillLevel } from '../entities/user-progress.entity';

export class UpdateProgressDto {
  @ApiPropertyOptional({ description: 'Puzzles attempted increment' })
  @IsOptional()
  @IsInt()
  puzzlesAttemptedIncrement?: number;

  @ApiPropertyOptional({ description: 'Puzzles completed increment' })
  @IsOptional()
  @IsInt()
  puzzlesCompletedIncrement?: number;

  @ApiPropertyOptional({ description: 'Puzzles solved increment' })
  @IsOptional()
  @IsInt()
  puzzlesSolvedIncrement?: number;

  @ApiPropertyOptional({ description: 'Time spent increment (seconds)' })
  @IsOptional()
  @IsInt()
  timeSpentIncrement?: number;

  @ApiPropertyOptional({ description: 'Experience points increment' })
  @IsOptional()
  @IsInt()
  experiencePointsIncrement?: number;

  @ApiPropertyOptional({ description: 'Hints used increment' })
  @IsOptional()
  @IsInt()
  hintsUsedIncrement?: number;

  @ApiPropertyOptional({ description: 'Perfect solves increment' })
  @IsOptional()
  @IsInt()
  perfectSolvesIncrement?: number;

  @ApiPropertyOptional({ description: 'Updated skill level' })
  @IsOptional()
  @IsEnum(SkillLevel)
  currentSkillLevel?: SkillLevel;

  @ApiPropertyOptional({ description: 'Category statistics update' })
  @IsOptional()
  @IsObject()
  categoryStatsUpdate?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Difficulty statistics update' })
  @IsOptional()
  @IsObject()
  difficultyStatsUpdate?: Record<string, any>;
}
