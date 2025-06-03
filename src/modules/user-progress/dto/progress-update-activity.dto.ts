import {
  IsUUID,
  IsInt,
  IsOptional,
  IsString,
  IsEnum,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PuzzleDifficulty } from '../../puzzles/entities/puzzle.entity';

export class ProgressUpdateActivityDto {
  @ApiProperty({ description: 'Puzzle ID' })
  @IsUUID()
  puzzleId: string;

  @ApiProperty({ description: 'Puzzle difficulty' })
  @IsEnum(PuzzleDifficulty)
  difficulty: PuzzleDifficulty;

  @ApiPropertyOptional({ description: 'Category ID' })
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiProperty({ description: 'Time spent on puzzle (seconds)' })
  @IsInt()
  @Min(0)
  timeSpent: number;

  @ApiProperty({ description: 'Whether puzzle was completed' })
  completed: boolean;

  @ApiProperty({ description: 'Whether puzzle was solved correctly' })
  solved: boolean;

  @ApiPropertyOptional({ description: 'Number of hints used' })
  @IsOptional()
  @IsInt()
  @Min(0)
  hintsUsed?: number;

  @ApiPropertyOptional({ description: 'User rating given to puzzle' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  ratingGiven?: number;

  @ApiPropertyOptional({ description: 'Additional context' })
  @IsOptional()
  @IsString()
  context?: string;
}
