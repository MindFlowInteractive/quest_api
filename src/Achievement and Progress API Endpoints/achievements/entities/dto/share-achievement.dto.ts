import { IsString, IsOptional, IsArray } from 'class-validator';

export class ShareAchievementDto {
  @IsString()
  platform: string;

  @IsOptional()
  @IsString()
  message?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}
