import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class CreateFeedbackDto {
  @IsString()
  @IsOptional()
  comment?: string;

  @IsInt()
  @Min(1)
  @Max(5)
  @IsOptional()
  difficulty?: number;

  @IsInt()
  @Min(1)
  @Max(5)
  @IsOptional()
  quality?: number;
}
