import { IsString, IsNumber, IsOptional, IsObject, IsUUID } from "class-validator"

export class ProcessUserActionDto {
  @IsUUID()
  userId: string

  @IsString()
  action: string

  @IsNumber()
  @IsOptional()
  value?: number

  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>
}

export class UserActionResponseDto {
  unlockedAchievements: {
    id: string
    name: string
    description: string
    points: number
    rarity: string
  }[]
  totalPointsEarned: number
  newContentUnlocked: {
    id: string
    name: string
    type: string
  }[]
}
