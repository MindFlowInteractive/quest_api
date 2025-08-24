import { IsOptional, IsBoolean, IsNumber, IsString, Min, Max } from "class-validator"
import { Type } from "class-transformer"

export class GetAchievementsQueryDto {
  @IsBoolean()
  @IsOptional()
  @Type(() => Boolean)
  includeHidden?: boolean

  @IsString()
  @IsOptional()
  category?: string

  @IsString()
  @IsOptional()
  type?: string

  @IsString()
  @IsOptional()
  rarity?: string
}

export class GetLeaderboardQueryDto {
  @IsString()
  @IsOptional()
  achievementId?: string

  @IsNumber()
  @Min(1)
  @Max(100)
  @IsOptional()
  @Type(() => Number)
  limit?: number = 10
}

export class EquipContentDto {
  @IsString()
  contentId: string
}
