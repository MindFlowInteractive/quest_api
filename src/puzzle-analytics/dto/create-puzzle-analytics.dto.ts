import { IsString, IsNumber, IsBoolean, IsOptional, IsObject, Min } from "class-validator"

export class CreatePuzzleAnalyticsDto {
  @IsString()
  puzzleId: string

  @IsString()
  userId: string

  @IsOptional()
  @IsNumber()
  @Min(0)
  completionTimeMs?: number

  @IsOptional()
  @IsNumber()
  @Min(1)
  attemptsCount?: number

  @IsOptional()
  @IsBoolean()
  isCompleted?: boolean

  @IsOptional()
  @IsNumber()
  @Min(1)
  difficultyRating?: number

  @IsOptional()
  @IsNumber()
  @Min(0)
  hintsUsed?: number

  @IsOptional()
  @IsNumber()
  score?: number

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>
}
