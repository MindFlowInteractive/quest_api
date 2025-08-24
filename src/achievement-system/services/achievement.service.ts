import { Injectable, Logger, NotFoundException } from "@nestjs/common"
import type { Repository } from "typeorm"
import {
  type Achievement,
  AchievementType,
  type UserAchievement,
  type UnlockableContent,
  type UserUnlockedContent,
} from "../entities"

export interface UserProgress {
  userId: string
  action: string
  value?: number
  metadata?: Record<string, any>
}

export interface AchievementProgress {
  achievement: Achievement
  progress: Record<string, any>
  isUnlocked: boolean
  progressPercentage: number
}

@Injectable()
export class AchievementService {
  private readonly logger = new Logger(AchievementService.name)

  constructor(
    private achievementRepository: Repository<Achievement>,
    private userAchievementRepository: Repository<UserAchievement>,
    private unlockableContentRepository: Repository<UnlockableContent>,
    private userUnlockedContentRepository: Repository<UserUnlockedContent>,
  ) {}

  async getAllAchievements(includeHidden = false): Promise<Achievement[]> {
    const query = this.achievementRepository
      .createQueryBuilder("achievement")
      .leftJoinAndSelect("achievement.unlockableContents", "content")
      .orderBy("achievement.category", "ASC")
      .addOrderBy("achievement.sortOrder", "ASC")

    if (!includeHidden) {
      query.where("achievement.isHidden = :isHidden", { isHidden: false })
    }

    return query.getMany()
  }

  async getUserAchievements(userId: string): Promise<AchievementProgress[]> {
    const achievements = await this.getAllAchievements()
    const userAchievements = await this.userAchievementRepository.find({
      where: { userId },
      relations: ["achievement"],
    })

    const userAchievementMap = new Map(userAchievements.map((ua) => [ua.achievementId, ua]))

    return achievements.map((achievement) => {
      const userAchievement = userAchievementMap.get(achievement.id)
      const progress = userAchievement?.progress || {}
      const isUnlocked = userAchievement?.isUnlocked || false
      const progressPercentage = this.calculateProgressPercentage(achievement, progress)

      return {
        achievement,
        progress,
        isUnlocked,
        progressPercentage,
      }
    })
  }

  async processUserAction(userProgress: UserProgress): Promise<Achievement[]> {
    const { userId, action, value = 1, metadata = {} } = userProgress
    const unlockedAchievements: Achievement[] = []

    // Get all active achievements that could be affected by this action
    const relevantAchievements = await this.achievementRepository.find({
      where: { isActive: true },
      relations: ["unlockableContents"],
    })

    for (const achievement of relevantAchievements) {
      if (this.isActionRelevant(achievement, action)) {
        const wasUnlocked = await this.updateAchievementProgress(userId, achievement, action, value, metadata)

        if (wasUnlocked) {
          unlockedAchievements.push(achievement)
          await this.unlockContent(userId, achievement)
        }
      }
    }

    return unlockedAchievements
  }

  private async updateAchievementProgress(
    userId: string,
    achievement: Achievement,
    action: string,
    value: number,
    metadata: Record<string, any>,
  ): Promise<boolean> {
    let userAchievement = await this.userAchievementRepository.findOne({
      where: { userId, achievementId: achievement.id },
    })

    if (!userAchievement) {
      userAchievement = this.userAchievementRepository.create({
        userId,
        achievementId: achievement.id,
        progress: {},
        isUnlocked: false,
      })
    }

    if (userAchievement.isUnlocked) {
      return false // Already unlocked
    }

    // Update progress based on achievement type
    const updatedProgress = this.updateProgressByType(achievement, userAchievement.progress, action, value, metadata)

    userAchievement.progress = updatedProgress

    // Check if achievement should be unlocked
    const shouldUnlock = this.checkUnlockConditions(achievement, updatedProgress)

    if (shouldUnlock) {
      userAchievement.isUnlocked = true
      userAchievement.unlockedAt = new Date()
      this.logger.log(`Achievement unlocked: ${achievement.name} for user ${userId}`)
    }

    await this.userAchievementRepository.save(userAchievement)
    return shouldUnlock
  }

  private updateProgressByType(
    achievement: Achievement,
    currentProgress: Record<string, any>,
    action: string,
    value: number,
    metadata: Record<string, any>,
  ): Record<string, any> {
    const progress = { ...currentProgress }

    switch (achievement.type) {
      case AchievementType.MILESTONE:
        progress[action] = (progress[action] || 0) + value
        break

      case AchievementType.STREAK:
        if (metadata.isConsecutive) {
          progress.currentStreak = (progress.currentStreak || 0) + 1
          progress.maxStreak = Math.max(progress.maxStreak || 0, progress.currentStreak)
        } else {
          progress.currentStreak = 1
        }
        progress.lastActionDate = new Date().toISOString()
        break

      case AchievementType.COLLECTION:
        if (!progress.collected) {
          progress.collected = []
        }
        if (metadata.itemId && !progress.collected.includes(metadata.itemId)) {
          progress.collected.push(metadata.itemId)
        }
        progress.totalCollected = progress.collected.length
        break

      case AchievementType.SOCIAL:
        progress[action] = (progress[action] || 0) + value
        if (metadata.targetUserId) {
          progress.uniqueInteractions = progress.uniqueInteractions || new Set()
          progress.uniqueInteractions.add(metadata.targetUserId)
          progress.uniqueCount = progress.uniqueInteractions.size
        }
        break

      case AchievementType.TIME_BASED:
        progress.totalTime = (progress.totalTime || 0) + value
        progress.sessions = (progress.sessions || 0) + 1
        progress.lastSessionDate = new Date().toISOString()
        break

      case AchievementType.SKILL:
        progress[action] = (progress[action] || 0) + value
        if (metadata.skillLevel) {
          progress.maxSkillLevel = Math.max(progress.maxSkillLevel || 0, metadata.skillLevel)
        }
        break

      default:
        progress[action] = (progress[action] || 0) + value
    }

    return progress
  }

  private checkUnlockConditions(achievement: Achievement, progress: Record<string, any>): boolean {
    const conditions = achievement.unlockConditions

    if (!conditions) {
      return false
    }

    // Handle different condition types
    for (const [key, condition] of Object.entries(conditions)) {
      if (typeof condition === "number") {
        // Simple numeric condition
        if ((progress[key] || 0) < condition) {
          return false
        }
      } else if (typeof condition === "object") {
        // Complex condition object
        if (condition.min !== undefined && (progress[key] || 0) < condition.min) {
          return false
        }
        if (condition.max !== undefined && (progress[key] || 0) > condition.max) {
          return false
        }
        if (condition.exact !== undefined && progress[key] !== condition.exact) {
          return false
        }
        if (condition.contains && Array.isArray(progress[key])) {
          const hasAll = condition.contains.every((item: any) => progress[key].includes(item))
          if (!hasAll) {
            return false
          }
        }
      }
    }

    return true
  }

  private calculateProgressPercentage(achievement: Achievement, progress: Record<string, any>): number {
    const conditions = achievement.unlockConditions

    if (!conditions) {
      return 0
    }

    let totalProgress = 0
    let conditionCount = 0

    for (const [key, condition] of Object.entries(conditions)) {
      conditionCount++
      const currentValue = progress[key] || 0

      if (typeof condition === "number") {
        totalProgress += Math.min(currentValue / condition, 1)
      } else if (typeof condition === "object" && condition.min !== undefined) {
        totalProgress += Math.min(currentValue / condition.min, 1)
      } else {
        totalProgress += currentValue > 0 ? 1 : 0
      }
    }

    return conditionCount > 0 ? Math.round((totalProgress / conditionCount) * 100) : 0
  }

  private isActionRelevant(achievement: Achievement, action: string): boolean {
    const conditions = achievement.unlockConditions
    return conditions && Object.keys(conditions).includes(action)
  }

  private async unlockContent(userId: string, achievement: Achievement): Promise<void> {
    const contents = await this.unlockableContentRepository.find({
      where: { achievementId: achievement.id, isActive: true },
    })

    for (const content of contents) {
      const existingUnlock = await this.userUnlockedContentRepository.findOne({
        where: { userId, contentId: content.id },
      })

      if (!existingUnlock) {
        const userUnlockedContent = this.userUnlockedContentRepository.create({
          userId,
          contentId: content.id,
          isEquipped: false,
        })

        await this.userUnlockedContentRepository.save(userUnlockedContent)
        this.logger.log(`Content unlocked: ${content.name} for user ${userId}`)
      }
    }
  }

  async getUserUnlockedContent(userId: string): Promise<UserUnlockedContent[]> {
    return this.userUnlockedContentRepository.find({
      where: { userId },
      relations: ["content", "content.achievement"],
      order: { unlockedAt: "DESC" },
    })
  }

  async equipContent(userId: string, contentId: string): Promise<void> {
    const userContent = await this.userUnlockedContentRepository.findOne({
      where: { userId, contentId },
      relations: ["content"],
    })

    if (!userContent) {
      throw new NotFoundException("Content not found or not unlocked")
    }

    // Unequip other content of the same type
    await this.userUnlockedContentRepository.update(
      { userId, isEquipped: true },
      { isEquipped: false, equippedAt: null },
    )

    // Equip the selected content
    userContent.isEquipped = true
    userContent.equippedAt = new Date()
    await this.userUnlockedContentRepository.save(userContent)
  }

  async getLeaderboard(achievementId?: string, limit = 10): Promise<any[]> {
    const query = this.userAchievementRepository
      .createQueryBuilder("ua")
      .leftJoinAndSelect("ua.achievement", "achievement")
      .where("ua.isUnlocked = :isUnlocked", { isUnlocked: true })
      .orderBy("ua.unlockedAt", "ASC")
      .limit(limit)

    if (achievementId) {
      query.andWhere("ua.achievementId = :achievementId", { achievementId })
    }

    return query.getMany()
  }
}
