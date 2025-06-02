import { IsNumber, IsOptional, IsObject, Min, Max } from 'class-validator';

export class UpdateProgressDto {
  @IsNumber()
  @Min(0)
  @Max(100)
  progress: number;

  @IsOptional()
  @IsObject()
  progressData?: Record<string, any>;
}
