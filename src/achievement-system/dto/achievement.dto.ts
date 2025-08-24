import { IsString, IsEnum, IsNumber, IsBoolean, IsOptional, IsObject, Min } from "class-validator"
import { AchievementType, AchievementRarity } from "../entities"

export class CreateAchievementDto {
  @IsString()
  key: string

  @IsString()
  name: string

  @IsString()
  description: string

  @IsEnum(AchievementType)
  type: AchievementType

  @IsEnum(AchievementRarity)
  @IsOptional()
  rarity?: AchievementRarity

  @IsString()
  @IsOptional()
  iconUrl?: string

  @IsNumber()
  @Min(0)
  @IsOptional()
  points?: number

  @IsObject()
  @IsOptional()
  unlockConditions?: Record<string, any>

  @IsBoolean()
  @IsOptional()
  isActive?: boolean

  @IsBoolean()
  @IsOptional()
  isHidden?: boolean

  @IsString()
  @IsOptional()
  category?: string

  @IsNumber()
  @Min(1)
  @IsOptional()
  sortOrder?: number
}

export class UpdateAchievementDto {
  @IsString()
  @IsOptional()
  name?: string

  @IsString()
  @IsOptional()
  description?: string

  @IsEnum(AchievementType)
  @IsOptional()
  type?: AchievementType

  @IsEnum(AchievementRarity)
  @IsOptional()
  rarity?: AchievementRarity

  @IsString()
  @IsOptional()
  iconUrl?: string

  @IsNumber()
  @Min(0)
  @IsOptional()
  points?: number

  @IsObject()
  @IsOptional()
  unlockConditions?: Record<string, any>

  @IsBoolean()
  @IsOptional()
  isActive?: boolean

  @IsBoolean()
  @IsOptional()
  isHidden?: boolean

  @IsString()
  @IsOptional()
  category?: string

  @IsNumber()
  @Min(1)
  @IsOptional()
  sortOrder?: number
}

export class AchievementResponseDto {
  id: string
  key: string
  name: string
  description: string
  type: AchievementType
  rarity: AchievementRarity
  iconUrl?: string
  points: number
  unlockConditions?: Record<string, any>
  isActive: boolean
  isHidden: boolean
  category?: string
  sortOrder: number
  createdAt: Date
  updatedAt: Date
}

export class AchievementProgressResponseDto {
  achievement: AchievementResponseDto
  progress: Record<string, any>
  isUnlocked: boolean
  progressPercentage: number
  unlockedAt?: Date
}
