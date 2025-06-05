import {
  IsString,
  IsNumber,
  IsOptional,
  IsObject,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreatePuzzleDto {
  @ApiProperty({
    description: 'Type of puzzle to create',
    example: 'sliding-puzzle',
  })
  @IsString()
  type: string;

  @ApiProperty({
    description: 'Difficulty level (1-10)',
    minimum: 1,
    maximum: 10,
  })
  @IsNumber()
  @Min(1)
  @Max(10)
  difficulty: number;

  @ApiProperty({
    description: 'Player ID for difficulty adjustment',
    required: false,
  })
  @IsOptional()
  @IsString()
  playerId?: string;
}

export class MovePuzzleDto {
  @ApiProperty({ description: 'Unique move identifier' })
  @IsString()
  id: string;

  @ApiProperty({ description: 'Type of move', example: 'slide' })
  @IsString()
  type: string;

  @ApiProperty({ description: 'Move data containing positions/actions' })
  @IsObject()
  data: any;

  @ApiProperty({ description: 'Player making the move' })
  @IsString()
  playerId: string;
}

export class PuzzleStateDto {
  @ApiProperty({ description: 'Puzzle unique identifier' })
  @IsString()
  id: string;

  @ApiProperty({ description: 'Current puzzle data/grid state' })
  @IsObject()
  data: any;

  @ApiProperty({
    description: 'Puzzle metadata including moves, time, difficulty',
  })
  @IsObject()
  metadata: {
    moves: number;
    timeSpent: number;
    difficulty: number;
    createdAt: Date;
    lastModified: Date;
  };
}

export class GetHintDto {
  @ApiProperty({
    description: 'Hint level (1-3)',
    minimum: 1,
    maximum: 3,
    default: 1,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(3)
  level?: number = 1;
}

export class UpdatePlayerMetricsDto {
  @ApiProperty({
    description: 'Average solve time in milliseconds',
    required: false,
  })
  @IsOptional()
  @IsNumber()
  averageSolveTime?: number;

  @ApiProperty({
    description: 'Average number of moves per puzzle',
    required: false,
  })
  @IsOptional()
  @IsNumber()
  averageMoves?: number;

  @ApiProperty({ description: 'Success rate (0-1)', required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  successRate?: number;

  @ApiProperty({ description: 'Hints usage rate (0-1)', required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  hintsUsageRate?: number;
}
