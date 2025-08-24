import {
  Controller,
  Post,
  Put,
  Delete,
  Param,
  HttpStatus,
  HttpCode,
  ParseUUIDPipe,
  NotFoundException,
} from "@nestjs/common"
import type { Repository } from "typeorm"
import type { Achievement, UnlockableContent } from "../entities"
import type { AchievementSeederService } from "../services"
import type {
  CreateAchievementDto,
  UpdateAchievementDto,
  CreateUnlockableContentDto,
  UpdateUnlockableContentDto,
  AchievementResponseDto,
  UnlockableContentResponseDto,
} from "../dto"

@Controller("admin/achievements")
export class AdminAchievementController {
  constructor(
    private readonly achievementRepository: Repository<Achievement>,
    private readonly unlockableContentRepository: Repository<UnlockableContent>,
    private readonly achievementSeederService: AchievementSeederService,
  ) {}

  @Post()
  async createAchievement(createAchievementDto: CreateAchievementDto): Promise<AchievementResponseDto> {
    const achievement = this.achievementRepository.create(createAchievementDto)
    const savedAchievement = await this.achievementRepository.save(achievement)
    return this.mapToAchievementResponse(savedAchievement)
  }

  @Put(":id")
  async updateAchievement(
    @Param("id", ParseUUIDPipe) id: string,
    updateAchievementDto: UpdateAchievementDto,
  ): Promise<AchievementResponseDto> {
    const achievement = await this.achievementRepository.findOne({ where: { id } })
    if (!achievement) {
      throw new NotFoundException("Achievement not found")
    }

    Object.assign(achievement, updateAchievementDto)
    const updatedAchievement = await this.achievementRepository.save(achievement)
    return this.mapToAchievementResponse(updatedAchievement)
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteAchievement(@Param("id", ParseUUIDPipe) id: string): Promise<void> {
    const result = await this.achievementRepository.delete(id)
    if (result.affected === 0) {
      throw new NotFoundException("Achievement not found")
    }
  }

  @Post("content")
  async createUnlockableContent(createContentDto: CreateUnlockableContentDto): Promise<UnlockableContentResponseDto> {
    const content = this.unlockableContentRepository.create(createContentDto)
    const savedContent = await this.unlockableContentRepository.save(content)
    return this.mapToContentResponse(savedContent)
  }

  @Put("content/:id")
  async updateUnlockableContent(
    @Param("id", ParseUUIDPipe) id: string,
    updateContentDto: UpdateUnlockableContentDto,
  ): Promise<UnlockableContentResponseDto> {
    const content = await this.unlockableContentRepository.findOne({ where: { id } })
    if (!content) {
      throw new NotFoundException("Unlockable content not found")
    }

    Object.assign(content, updateContentDto)
    const updatedContent = await this.unlockableContentRepository.save(content)
    return this.mapToContentResponse(updatedContent)
  }

  @Delete("content/:id")
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteUnlockableContent(@Param("id", ParseUUIDPipe) id: string): Promise<void> {
    const result = await this.unlockableContentRepository.delete(id)
    if (result.affected === 0) {
      throw new NotFoundException("Unlockable content not found")
    }
  }

  @Post("seed")
  @HttpCode(HttpStatus.OK)
  async seedAchievements(): Promise<{ message: string }> {
    await this.achievementSeederService.seedAchievements()
    return { message: "Achievements seeded successfully" }
  }

  private mapToAchievementResponse(achievement: Achievement): AchievementResponseDto {
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

  private mapToContentResponse(content: UnlockableContent): UnlockableContentResponseDto {
    return {
      id: content.id,
      name: content.name,
      description: content.description,
      type: content.type,
      contentData: content.contentData,
      imageUrl: content.imageUrl,
      achievementId: content.achievementId,
      isActive: content.isActive,
      expiresAt: content.expiresAt,
      createdAt: content.createdAt,
      updatedAt: content.updatedAt,
    }
  }
}
