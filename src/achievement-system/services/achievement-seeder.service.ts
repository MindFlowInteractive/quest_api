import { Injectable, Logger } from "@nestjs/common"
import type { Repository } from "typeorm"
import { type Achievement, AchievementType, AchievementRarity, type UnlockableContent, ContentType } from "../entities"

@Injectable()
export class AchievementSeederService {
  private readonly logger = new Logger(AchievementSeederService.name)

  constructor(
    private achievementRepository: Repository<Achievement>,
    private unlockableContentRepository: Repository<UnlockableContent>,
  ) {}

  async seedAchievements(): Promise<void> {
    const achievements = [
      {
        key: "first_login",
        name: "Welcome Aboard",
        description: "Complete your first login",
        type: AchievementType.MILESTONE,
        rarity: AchievementRarity.COMMON,
        points: 10,
        unlockConditions: { login: 1 },
        category: "Getting Started",
        content: {
          name: "Welcome Badge",
          description: "A badge to commemorate your first login",
          type: ContentType.BADGE,
          contentData: { badgeColor: "#4CAF50", icon: "welcome" },
        },
      },
      {
        key: "streak_master",
        name: "Streak Master",
        description: "Maintain a 7-day login streak",
        type: AchievementType.STREAK,
        rarity: AchievementRarity.RARE,
        points: 100,
        unlockConditions: { maxStreak: 7 },
        category: "Dedication",
        content: {
          name: "Fire Avatar Frame",
          description: "A fiery avatar frame for dedicated users",
          type: ContentType.AVATAR,
          contentData: { frameStyle: "fire", animation: true },
        },
      },
      {
        key: "social_butterfly",
        name: "Social Butterfly",
        description: "Interact with 50 different users",
        type: AchievementType.SOCIAL,
        rarity: AchievementRarity.UNCOMMON,
        points: 75,
        unlockConditions: { uniqueCount: 50 },
        category: "Social",
        content: {
          name: "Butterfly Title",
          description: "Display 'Social Butterfly' as your title",
          type: ContentType.TITLE,
          contentData: { title: "Social Butterfly", color: "#E91E63" },
        },
      },
      {
        key: "time_invested",
        name: "Time Well Spent",
        description: "Spend 100 hours in the application",
        type: AchievementType.TIME_BASED,
        rarity: AchievementRarity.EPIC,
        points: 200,
        unlockConditions: { totalTime: 360000 }, // 100 hours in seconds
        category: "Dedication",
        content: {
          name: "Golden Theme",
          description: "Unlock the exclusive golden theme",
          type: ContentType.THEME,
          contentData: { themeName: "golden", primaryColor: "#FFD700" },
        },
      },
      {
        key: "collector",
        name: "Master Collector",
        description: "Collect all 20 rare items",
        type: AchievementType.COLLECTION,
        rarity: AchievementRarity.LEGENDARY,
        points: 500,
        unlockConditions: { totalCollected: 20 },
        category: "Collection",
        content: {
          name: "Collector's Crown",
          description: "A majestic crown for master collectors",
          type: ContentType.AVATAR,
          contentData: { crownStyle: "legendary", gems: true },
        },
      },
    ]

    for (const achievementData of achievements) {
      const existingAchievement = await this.achievementRepository.findOne({
        where: { key: achievementData.key },
      })

      if (!existingAchievement) {
        const { content, ...achievementInfo } = achievementData
        const achievement = this.achievementRepository.create(achievementInfo)
        const savedAchievement = await this.achievementRepository.save(achievement)

        // Create associated unlockable content
        const unlockableContent = this.unlockableContentRepository.create({
          ...content,
          achievementId: savedAchievement.id,
        })
        await this.unlockableContentRepository.save(unlockableContent)

        this.logger.log(`Seeded achievement: ${achievementData.name}`)
      }
    }

    this.logger.log("Achievement seeding completed")
  }
}
