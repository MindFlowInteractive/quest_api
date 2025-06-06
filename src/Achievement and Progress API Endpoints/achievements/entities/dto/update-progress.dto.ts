import { IsNumber, IsOptional, IsObject, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateProgressDto {
  @ApiProperty({
    description: 'Progress value as a percentage (0 to 100)',
    minimum: 0,
    maximum: 100,
    example: 75,
  })
  @IsNumber()
  @Min(0)
  @Max(100)
  progress: number;

  @ApiPropertyOptional({
    description: 'Additional data or metadata about the progress',
    example: { puzzlesSolved: 15, milestones: ['firstWin'] },
    type: Object,
  })
  @IsOptional()
  @IsObject()
  progressData?: Record<string, any>;
}
