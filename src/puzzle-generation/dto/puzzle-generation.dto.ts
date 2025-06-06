import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsObject,
  Min,
  Max,
  IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PuzzleType } from '../interfaces/puzzle.interface';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class GeneratePuzzleDto {
  @ApiProperty({
    enum: PuzzleType,
    description: 'The type of puzzle to generate (e.g., sudoku, crossword)',
  })
  @IsEnum(PuzzleType)
  type: PuzzleType;

  @ApiProperty({
    example: 5,
    description: 'Puzzle difficulty level (1-10)',
  })
  @IsNumber()
  @Min(1)
  @Max(10)
  difficulty: number;

  @ApiPropertyOptional({
    example: 9,
    description: 'Grid size for puzzles that support it (optional)',
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  size?: number;

  @ApiPropertyOptional({
    type: Object,
    description: 'Constraint rules for the puzzle generation',
    example: { uniqueRows: true },
  })
  @IsOptional()
  @IsObject()
  constraints?: any;

  @ApiPropertyOptional({
    example: 'space exploration',
    description: 'Theme or category of the puzzle',
  })
  @IsOptional()
  @IsString()
  theme?: string;

  @ApiPropertyOptional({
    example: 120,
    description: 'Time limit in seconds for solving the puzzle',
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  timeLimit?: number;
}

export class AnalyticsQueryDto {
  @ApiPropertyOptional({
    example: '2024-01-01',
    description: 'Filter analytics from this start date (ISO string)',
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({
    example: '2024-12-31',
    description: 'Filter analytics up to this end date (ISO string)',
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}
