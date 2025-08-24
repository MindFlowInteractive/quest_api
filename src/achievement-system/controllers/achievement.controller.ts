import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  HttpStatus,
  HttpCode,
  ParseUUIDPipe,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common"
import type { AchievementService } from "../services"
import type {
  ProcessUserActionDto,
  GetAchievementsQueryDto,
  GetLeaderboardQueryDto,
  EquipContentDto,
  AchievementResponseDto,
  AchievementProgressResponseDto,
  UserActionResponseDto,
  UserUnlockedContentResponseDto,
} from "../dto"

@Controller("achievements")
export class AchievementController {
  constructor(private readonly achievementService: AchievementService) {}

  @Get()
  async getAllAchievements(query: GetAchievementsQueryDto): Promise<AchievementResponseDto[]> {
    const achievements = await this.achievementService.getAllAchievements(query.includeHidden)
    return achievements.map(this.mapToAchievementResponse)
  }

  @Get("user/:userId")
  async getUserAchievements(
    @Param("userId", ParseUUIDPipe) userId: string,
  ): Promise<AchievementProgressResponseDto[]> {
    const userAchievements = await this.achievementService.getUserAchievements(userId)
    return userAchievements.map((ua) => ({
      achievement: this.mapToAchievementResponse(ua.achievement),
      progress: ua.progress,
      isUnlocked: ua.isUnlocked,
      progressPercentage: ua.progressPercentage,
    }))
  }

  @Post("user/action")
  @HttpCode(HttpStatus.OK)
  async processUserAction(@Body() processUserActionDto: ProcessUserActionDto): Promise<UserActionResponseDto> {
    const unlockedAchievements = await this.achievementService.processUserAction(processUserActionDto)

    const totalPointsEarned = unlockedAchievements.reduce((sum, achievement) => sum + achievement.points, 0)

    const newContentUnlocked = unlockedAchievements.flatMap((achievement) =>
      achievement.unlockableContents?.map((content) => ({
        id: content.id,
        name: content.name,
        type: content.type,
      })) || [],
    )

    return {
      unlockedAchievements: unlockedAchievements.map((achievement) => ({
        id: achievement.id,
        name: achievement.name,
        description: achievement.description,
        points: achievement.points,
        rarity: achievement.rarity,
      })),
      totalPointsEarned,
      newContentUnlocked,
    }
  }

  @Get("user/:userId/content")
  async getUserUnlockedContent(
    @Param("userId", ParseUUIDPipe) userId: string,
  ): Promise<UserUnlockedContentResponseDto[]> {
    const unlockedContent = await this.achievementService.getUserUnlockedContent(userId)
    return unlockedContent.map((uc) => ({
      id: uc.id,
      content: {
        id: uc.content.id,
        name: uc.content.name,
        description: uc.content.description,
        type: uc.content.type,
        contentData: uc.content.contentData,
        imageUrl: uc.content.imageUrl,
        achievementId: uc.content.achievementId,
        isActive: uc.content.isActive,
        expiresAt: uc.content.expiresAt,
        createdAt: uc.content.createdAt,
        updatedAt: uc.content.updatedAt,
      },
      isEquipped: uc.isEquipped,
      equippedAt: uc.equippedAt,
      unlockedAt: uc.unlockedAt,
      metadata: uc.metadata,
    }))
  }

  @Post("user/:userId/content/equip")
  @HttpCode(HttpStatus.OK)
  async equipContent(
    @Param("userId", ParseUUIDPipe) userId: string,
    @Body() equipContentDto: EquipContentDto,
  ): Promise<{ message: string }> {
    try {
      await this.achievementService.equipContent(userId, equipContentDto.contentId)
      return { message: "Content equipped successfully" }
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw new NotFoundException("Content not found or not unlocked by user")
      }
      throw new BadRequestException("Failed to equip content")
    }
  }

  @Get("leaderboard")
  async getLeaderboard(query: GetLeaderboardQueryDto): Promise<any[]> {
    return this.achievementService.getLeaderboard(query.achievementId, query.limit)
  }

  @Get("stats/user/:userId")
  async getUserStats(@Param("userId", ParseUUIDPipe) userId: string): Promise<any> {
    const userAchievements = await this.achievementService.getUserAchievements(userId)
    const unlockedContent = await this.achievementService.getUserUnlockedContent(userId)

    const totalAchievements = userAchievements.length
    const unlockedAchievements = userAchievements.filter((ua) => ua.isUnlocked).length
    const totalPoints = userAchievements
      .filter((ua) => ua.isUnlocked)
      .reduce((sum, ua) => sum + ua.achievement.points, 0)

    const rarityBreakdown = userAchievements
      .filter((ua) => ua.isUnlocked)
      .reduce(
        (acc, ua) => {
          acc[ua.achievement.rarity] = (acc[ua.achievement.rarity] || 0) + 1
          return acc
        },
        {} as Record<string, number>,
      )

    return {
      totalAchievements,
      unlockedAchievements,
      completionPercentage: Math.round((unlockedAchievements / totalAchievements) * 100),
      totalPoints,
      totalUnlockedContent: unlockedContent.length,
      equippedContent: unlockedContent.filter((uc) => uc.isEquipped).length,
      rarityBreakdown,
    }
  }

  private mapToAchievementResponse(achievement: any): AchievementResponseDto {
    return {
      id: achievement.id,
      key: achievement.key,
      name: achievement.name,
      description: achievement.description,
      type: achievement.type,
      rarity: achievement.rarity,
      iconUrl: achievement.iconUrl,
      points: achievement.points,
      unlockConditions: achievement.unlockConditions,
      isActive: achievement.isActive,
      isHidden: achievement.isHidden,
      category: achievement.category,
      sortOrder: achievement.sortOrder,
      createdAt: achievement.createdAt,
      updatedAt: achievement.updatedAt,
    }
  }
}
