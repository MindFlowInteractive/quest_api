import { IsString, IsEnum, IsObject, IsOptional, IsBoolean, IsUUID, IsDateString } from "class-validator"
import { ContentType } from "../entities"

export class CreateUnlockableContentDto {
  @IsString()
  name: string

  @IsString()
  description: string

  @IsEnum(ContentType)
  type: ContentType

  @IsObject()
  contentData: Record<string, any>

  @IsString()
  @IsOptional()
  imageUrl?: string

  @IsUUID()
  @IsOptional()
  achievementId?: string

  @IsBoolean()
  @IsOptional()
  isActive?: boolean

  @IsDateString()
  @IsOptional()
  expiresAt?: string
}

export class UpdateUnlockableContentDto {
  @IsString()
  @IsOptional()
  name?: string

  @IsString()
  @IsOptional()
  description?: string

  @IsEnum(ContentType)
  @IsOptional()
  type?: ContentType

  @IsObject()
  @IsOptional()
  contentData?: Record<string, any>

  @IsString()
  @IsOptional()
  imageUrl?: string

  @IsBoolean()
  @IsOptional()
  isActive?: boolean

  @IsDateString()
  @IsOptional()
  expiresAt?: string
}

export class UnlockableContentResponseDto {
  id: string
  name: string
  description: string
  type: ContentType
  contentData: Record<string, any>
  imageUrl?: string
  achievementId?: string
  isActive: boolean
  expiresAt?: Date
  createdAt: Date
  updatedAt: Date
}

export class UserUnlockedContentResponseDto {
  id: string
  content: UnlockableContentResponseDto
  isEquipped: boolean
  equippedAt?: Date
  unlockedAt: Date
  metadata?: Record<string, any>
}
