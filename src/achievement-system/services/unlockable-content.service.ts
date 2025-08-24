import { Injectable, Logger, NotFoundException, BadRequestException } from "@nestjs/common"
import type { Repository } from "typeorm"
import { type UnlockableContent, type UserUnlockedContent, ContentType, type Achievement } from "../entities"
import type { CreateUnlockableContentDto, UpdateUnlockableContentDto } from "../dto"

export interface ContentFilter {
  type?: ContentType
  achievementId?: string
  isActive?: boolean
  category?: string
  isExpired?: boolean
}

export interface ContentRecommendation {
  content: UnlockableContent
  score: number
  reason: string
}

@Injectable()
export class UnlockableContentService {
  private readonly logger = new Logger(UnlockableContentService.name)

  constructor(
    private unlockableContentRepository: Repository<UnlockableContent>,
    private userUnlockedContentRepository: Repository<UserUnlockedContent>,
    private achievementRepository: Repository<Achievement>,
  ) {}

  async createContent(createContentDto: CreateUnlockableContentDto): Promise<UnlockableContent> {
    // Validate achievement exists if provided
    if (createContentDto.achievementId) {
      const achievement = await this.achievementRepository.findOne({
        where: { id: createContentDto.achievementId },
      })
      if (!achievement) {
        throw new NotFoundException("Achievement not found")
      }
    }

    // Validate content data based on type
    this.validateContentData(createContentDto.type, createContentDto.contentData)

    const content = this.unlockableContentRepository.create(createContentDto)
    return this.unlockableContentRepository.save(content)
  }

  async updateContent(id: string, updateContentDto: UpdateUnlockableContentDto): Promise<UnlockableContent> {
    const content = await this.unlockableContentRepository.findOne({ where: { id } })
    if (!content) {
      throw new NotFoundException("Unlockable content not found")
    }

    // Validate achievement exists if being updated
    if (updateContentDto.achievementId) {
      const achievement = await this.achievementRepository.findOne({
        where: { id: updateContentDto.achievementId },
      })
      if (!achievement) {
        throw new NotFoundException("Achievement not found")
      }
    }

    // Validate content data if being updated
    if (updateContentDto.type && updateContentDto.contentData) {
      this.validateContentData(updateContentDto.type, updateContentDto.contentData)
    }

    Object.assign(content, updateContentDto)
    return this.unlockableContentRepository.save(content)
  }

  async deleteContent(id: string): Promise<void> {
    const result = await this.unlockableContentRepository.delete(id)
    if (result.affected === 0) {
      throw new NotFoundException("Unlockable content not found")
    }
  }

  async getContentById(id: string): Promise<UnlockableContent> {
    const content = await this.unlockableContentRepository.findOne({
      where: { id },
      relations: ["achievement"],
    })
    if (!content) {
      throw new NotFoundException("Unlockable content not found")
    }
    return content
  }

  async getAllContent(filter: ContentFilter = {}): Promise<UnlockableContent[]> {
    const query = this.unlockableContentRepository
      .createQueryBuilder("content")
      .leftJoinAndSelect("content.achievement", "achievement")

    if (filter.type) {
      query.andWhere("content.type = :type", { type: filter.type })
    }

    if (filter.achievementId) {
      query.andWhere("content.achievementId = :achievementId", { achievementId: filter.achievementId })
    }

    if (filter.isActive !== undefined) {
      query.andWhere("content.isActive = :isActive", { isActive: filter.isActive })
    }

    if (filter.category) {
      query.andWhere("achievement.category = :category", { category: filter.category })
    }

    if (filter.isExpired !== undefined) {
      const now = new Date()
      if (filter.isExpired) {
        query.andWhere("content.expiresAt IS NOT NULL AND content.expiresAt < :now", { now })
      } else {
        query.andWhere("(content.expiresAt IS NULL OR content.expiresAt > :now)", { now })
      }
    }

    return query.orderBy("content.sortOrder", "ASC").addOrderBy("content.createdAt", "DESC").getMany()
  }

  async getUserAvailableContent(userId: string, contentType?: ContentType): Promise<UnlockableContent[]> {
    const query = this.unlockableContentRepository
      .createQueryBuilder("content")
      .leftJoinAndSelect("content.achievement", "achievement")
      .leftJoin("user_unlocked_contents", "uuc", "uuc.contentId = content.id AND uuc.userId = :userId", { userId })
      .where("content.isActive = :isActive", { isActive: true })
      .andWhere("(content.expiresAt IS NULL OR content.expiresAt > :now)", { now: new Date() })
      .andWhere("uuc.id IS NOT NULL") // User has unlocked this content

    if (contentType) {
      query.andWhere("content.type = :type", { type: contentType })
    }

    return query.orderBy("content.sortOrder", "ASC").getMany()
  }

  async getContentRecommendations(userId: string, limit = 5): Promise<ContentRecommendation[]> {
    // Get user's unlocked content to understand preferences
    const userContent = await this.userUnlockedContentRepository.find({
      where: { userId },
      relations: ["content", "content.achievement"],
    })

    // Get all available content
    const allContent = await this.getAllContent({ isActive: true, isExpired: false })

    // Calculate recommendations based on user preferences and content rarity
    const recommendations: ContentRecommendation[] = []

    for (const content of allContent) {
      // Skip if user already has this content
      if (userContent.some((uc) => uc.contentId === content.id)) {
        continue
      }

      let score = 0
      let reason = ""

      // Score based on content type preferences
      const userTypePreferences = this.getUserTypePreferences(userContent)
      const typeScore = userTypePreferences[content.type] || 0
      score += typeScore * 0.3

      // Score based on achievement category preferences
      if (content.achievement) {
        const categoryPreferences = this.getUserCategoryPreferences(userContent)
        const categoryScore = categoryPreferences[content.achievement.category] || 0
        score += categoryScore * 0.2
      }

      // Score based on rarity (rarer items get higher scores)
      if (content.achievement) {
        const rarityScore = this.getRarityScore(content.achievement.rarity)
        score += rarityScore * 0.3
      }

      // Score based on recency (newer content gets slight boost)
      const ageInDays = (Date.now() - content.createdAt.getTime()) / (1000 * 60 * 60 * 24)
      const recencyScore = Math.max(0, 1 - ageInDays / 30) // Boost for content less than 30 days old
      score += recencyScore * 0.2

      // Generate reason
      if (typeScore > 0) {
        reason = `You seem to enjoy ${content.type} content`
      } else if (content.achievement?.rarity === "legendary") {
        reason = "Rare legendary content"
      } else {
        reason = "New content available"
      }

      recommendations.push({ content, score, reason })
    }

    // Sort by score and return top recommendations
    return recommendations.sort((a, b) => b.score - a.score).slice(0, limit)
  }

  async expireContent(): Promise<number> {
    const now = new Date()
    const result = await this.unlockableContentRepository.update(
      { expiresAt: { $lte: now } as any, isActive: true },
      { isActive: false },
    )

    this.logger.log(`Expired ${result.affected} content items`)
    return result.affected || 0
  }

  async getContentStats(): Promise<any> {
    const totalContent = await this.unlockableContentRepository.count()
    const activeContent = await this.unlockableContentRepository.count({ where: { isActive: true } })

    const contentByType = await this.unlockableContentRepository
      .createQueryBuilder("content")
      .select("content.type", "type")
      .addSelect("COUNT(*)", "count")
      .groupBy("content.type")
      .getRawMany()

    const contentByAchievement = await this.unlockableContentRepository
      .createQueryBuilder("content")
      .leftJoin("content.achievement", "achievement")
      .select("achievement.category", "category")
      .addSelect("COUNT(*)", "count")
      .where("achievement.category IS NOT NULL")
      .groupBy("achievement.category")
      .getRawMany()

    const expiredContent = await this.unlockableContentRepository.count({
      where: {
        expiresAt: { $lte: new Date() } as any,
      },
    })

    return {
      totalContent,
      activeContent,
      expiredContent,
      contentByType: contentByType.reduce(
        (acc, item) => {
          acc[item.type] = Number.parseInt(item.count)
          return acc
        },
        {} as Record<string, number>,
      ),
      contentByCategory: contentByAchievement.reduce(
        (acc, item) => {
          acc[item.category] = Number.parseInt(item.count)
          return acc
        },
        {} as Record<string, number>,
      ),
    }
  }

  async bulkCreateContent(contentList: CreateUnlockableContentDto[]): Promise<UnlockableContent[]> {
    const createdContent: UnlockableContent[] = []

    for (const contentDto of contentList) {
      try {
        const content = await this.createContent(contentDto)
        createdContent.push(content)
      } catch (error) {
        this.logger.error(`Failed to create content: ${contentDto.name}`, error)
      }
    }

    return createdContent
  }

  async bulkUpdateContentStatus(contentIds: string[], isActive: boolean): Promise<number> {
    const result = await this.unlockableContentRepository.update(contentIds, { isActive })
    return result.affected || 0
  }

  private validateContentData(type: ContentType, contentData: Record<string, any>): void {
    switch (type) {
      case ContentType.BADGE:
        if (!contentData.badgeColor || !contentData.icon) {
          throw new BadRequestException("Badge content must have badgeColor and icon")
        }
        break

      case ContentType.AVATAR:
        if (!contentData.frameStyle && !contentData.crownStyle) {
          throw new BadRequestException("Avatar content must have frameStyle or crownStyle")
        }
        break

      case ContentType.THEME:
        if (!contentData.themeName || !contentData.primaryColor) {
          throw new BadRequestException("Theme content must have themeName and primaryColor")
        }
        break

      case ContentType.TITLE:
        if (!contentData.title) {
          throw new BadRequestException("Title content must have title")
        }
        break

      case ContentType.CURRENCY:
        if (!contentData.amount || typeof contentData.amount !== "number") {
          throw new BadRequestException("Currency content must have numeric amount")
        }
        break

      case ContentType.DISCOUNT:
        if (!contentData.percentage || typeof contentData.percentage !== "number") {
          throw new BadRequestException("Discount content must have numeric percentage")
        }
        break
    }
  }

  private getUserTypePreferences(userContent: UserUnlockedContent[]): Record<string, number> {
    const preferences: Record<string, number> = {}
    for (const content of userContent) {
      preferences[content.content.type] = (preferences[content.content.type] || 0) + 1
    }
    return preferences
  }

  private getUserCategoryPreferences(userContent: UserUnlockedContent[]): Record<string, number> {
    const preferences: Record<string, number> = {}
    for (const content of userContent) {
      if (content.content.achievement?.category) {
        const category = content.content.achievement.category
        preferences[category] = (preferences[category] || 0) + 1
      }
    }
    return preferences
  }

  private getRarityScore(rarity: string): number {
    const rarityScores = {
      common: 0.1,
      uncommon: 0.3,
      rare: 0.5,
      epic: 0.7,
      legendary: 1.0,
    }
    return rarityScores[rarity as keyof typeof rarityScores] || 0
  }
}
