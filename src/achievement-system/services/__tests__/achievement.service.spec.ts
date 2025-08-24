import { Test, type TestingModule } from "@nestjs/testing"
import { getRepositoryToken } from "@nestjs/typeorm"
import type { Repository } from "typeorm"
import { AchievementService } from "../achievement.service"
import {
  Achievement,
  UserAchievement,
  UnlockableContent,
  UserUnlockedContent,
  AchievementType,
  AchievementRarity,
  ContentType,
} from "../../entities"
import { jest } from "@jest/globals"

describe("AchievementService", () => {
  let service: AchievementService
  let achievementRepository: jest.Mocked<Repository<Achievement>>
  let userAchievementRepository: jest.Mocked<Repository<UserAchievement>>
  let unlockableContentRepository: jest.Mocked<Repository<UnlockableContent>>
  let userUnlockedContentRepository: jest.Mocked<Repository<UserUnlockedContent>>

  const mockAchievement: Achievement = {
    id: "achievement-1",
    key: "first_login",
    name: "Welcome Aboard",
    description: "Complete your first login",
    type: AchievementType.MILESTONE,
    rarity: AchievementRarity.COMMON,
    iconUrl: null,
    points: 10,
    unlockConditions: { login: 1 },
    isActive: true,
    isHidden: false,
    category: "Getting Started",
    sortOrder: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
    userAchievements: [],
    unlockableContents: [],
  }

  const mockUserAchievement: UserAchievement = {
    id: "user-achievement-1",
    userId: "user-1",
    achievementId: "achievement-1",
    progress: { login: 0 },
    isUnlocked: false,
    unlockedAt: null,
    metadata: {},
    createdAt: new Date(),
    achievement: mockAchievement,
  }

  const mockUnlockableContent: UnlockableContent = {
    id: "content-1",
    name: "Welcome Badge",
    description: "A badge to commemorate your first login",
    type: ContentType.BADGE,
    contentData: { badgeColor: "#4CAF50", icon: "welcome" },
    imageUrl: null,
    achievementId: "achievement-1",
    isActive: true,
    expiresAt: null,
    sortOrder: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
    achievement: mockAchievement,
    userUnlockedContents: [],
  }

  beforeEach(async () => {
    const mockRepository = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
      createQueryBuilder: jest.fn(),
    }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AchievementService,
        {
          provide: getRepositoryToken(Achievement),
          useValue: mockRepository,
        },
        {
          provide: getRepositoryToken(UserAchievement),
          useValue: mockRepository,
        },
        {
          provide: getRepositoryToken(UnlockableContent),
          useValue: mockRepository,
        },
        {
          provide: getRepositoryToken(UserUnlockedContent),
          useValue: mockRepository,
        },
      ],
    }).compile()

    service = module.get<AchievementService>(AchievementService)
    achievementRepository = module.get(getRepositoryToken(Achievement))
    userAchievementRepository = module.get(getRepositoryToken(UserAchievement))
    unlockableContentRepository = module.get(getRepositoryToken(UnlockableContent))
    userUnlockedContentRepository = module.get(getRepositoryToken(UserUnlockedContent))
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe("getAllAchievements", () => {
    it("should return all achievements excluding hidden ones by default", async () => {
      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([mockAchievement]),
      }

      achievementRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder)

      const result = await service.getAllAchievements()

      expect(achievementRepository.createQueryBuilder).toHaveBeenCalledWith("achievement")
      expect(mockQueryBuilder.where).toHaveBeenCalledWith("achievement.isHidden = :isHidden", { isHidden: false })
      expect(result).toEqual([mockAchievement])
    })

    it("should include hidden achievements when requested", async () => {
      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([mockAchievement]),
      }

      achievementRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder)

      await service.getAllAchievements(true)

      expect(mockQueryBuilder.where).not.toHaveBeenCalled()
    })
  })

  describe("processUserAction", () => {
    it("should unlock achievement when conditions are met", async () => {
      const userProgress = {
        userId: "user-1",
        action: "login",
        value: 1,
        metadata: {},
      }

      achievementRepository.find.mockResolvedValue([mockAchievement])
      userAchievementRepository.findOne.mockResolvedValue(null)
      userAchievementRepository.create.mockReturnValue(mockUserAchievement)
      userAchievementRepository.save.mockResolvedValue({
        ...mockUserAchievement,
        progress: { login: 1 },
        isUnlocked: true,
        unlockedAt: new Date(),
      })
      unlockableContentRepository.find.mockResolvedValue([mockUnlockableContent])
      userUnlockedContentRepository.findOne.mockResolvedValue(null)
      userUnlockedContentRepository.create.mockReturnValue({} as any)
      userUnlockedContentRepository.save.mockResolvedValue({} as any)

      const result = await service.processUserAction(userProgress)

      expect(result).toHaveLength(1)
      expect(result[0]).toEqual(mockAchievement)
      expect(userAchievementRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          progress: { login: 1 },
          isUnlocked: true,
        }),
      )
    })

    it("should not unlock achievement when conditions are not met", async () => {
      const userProgress = {
        userId: "user-1",
        action: "login",
        value: 1,
        metadata: {},
      }

      const achievementWithHigherRequirement = {
        ...mockAchievement,
        unlockConditions: { login: 5 },
      }

      achievementRepository.find.mockResolvedValue([achievementWithHigherRequirement])
      userAchievementRepository.findOne.mockResolvedValue(null)
      userAchievementRepository.create.mockReturnValue(mockUserAchievement)
      userAchievementRepository.save.mockResolvedValue({
        ...mockUserAchievement,
        progress: { login: 1 },
        isUnlocked: false,
      })

      const result = await service.processUserAction(userProgress)

      expect(result).toHaveLength(0)
      expect(userAchievementRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          progress: { login: 1 },
          isUnlocked: false,
        }),
      )
    })

    it("should handle streak achievements correctly", async () => {
      const streakAchievement = {
        ...mockAchievement,
        type: AchievementType.STREAK,
        unlockConditions: { maxStreak: 3 },
      }

      const userProgress = {
        userId: "user-1",
        action: "daily_visit",
        value: 1,
        metadata: { isConsecutive: true },
      }

      achievementRepository.find.mockResolvedValue([streakAchievement])
      userAchievementRepository.findOne.mockResolvedValue({
        ...mockUserAchievement,
        progress: { currentStreak: 2, maxStreak: 2 },
      })
      userAchievementRepository.save.mockResolvedValue({
        ...mockUserAchievement,
        progress: { currentStreak: 3, maxStreak: 3 },
        isUnlocked: true,
      })
      unlockableContentRepository.find.mockResolvedValue([])

      const result = await service.processUserAction(userProgress)

      expect(result).toHaveLength(1)
      expect(userAchievementRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          progress: expect.objectContaining({
            currentStreak: 3,
            maxStreak: 3,
          }),
          isUnlocked: true,
        }),
      )
    })

    it("should handle collection achievements correctly", async () => {
      const collectionAchievement = {
        ...mockAchievement,
        type: AchievementType.COLLECTION,
        unlockConditions: { totalCollected: 3 },
      }

      const userProgress = {
        userId: "user-1",
        action: "collect_item",
        value: 1,
        metadata: { itemId: "item-3" },
      }

      achievementRepository.find.mockResolvedValue([collectionAchievement])
      userAchievementRepository.findOne.mockResolvedValue({
        ...mockUserAchievement,
        progress: { collected: ["item-1", "item-2"], totalCollected: 2 },
      })
      userAchievementRepository.save.mockResolvedValue({
        ...mockUserAchievement,
        progress: { collected: ["item-1", "item-2", "item-3"], totalCollected: 3 },
        isUnlocked: true,
      })
      unlockableContentRepository.find.mockResolvedValue([])

      const result = await service.processUserAction(userProgress)

      expect(result).toHaveLength(1)
      expect(userAchievementRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          progress: expect.objectContaining({
            collected: ["item-1", "item-2", "item-3"],
            totalCollected: 3,
          }),
          isUnlocked: true,
        }),
      )
    })
  })

  describe("getUserAchievements", () => {
    it("should return user achievement progress", async () => {
      achievementRepository.createQueryBuilder.mockReturnValue({
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([mockAchievement]),
      })

      userAchievementRepository.find.mockResolvedValue([
        {
          ...mockUserAchievement,
          progress: { login: 1 },
          isUnlocked: true,
        },
      ])

      const result = await service.getUserAchievements("user-1")

      expect(result).toHaveLength(1)
      expect(result[0]).toEqual({
        achievement: mockAchievement,
        progress: { login: 1 },
        isUnlocked: true,
        progressPercentage: 100,
      })
    })

    it("should calculate progress percentage correctly", async () => {
      const achievementWithMultipleConditions = {
        ...mockAchievement,
        unlockConditions: { login: 10, posts: 5 },
      }

      achievementRepository.createQueryBuilder.mockReturnValue({
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([achievementWithMultipleConditions]),
      })

      userAchievementRepository.find.mockResolvedValue([
        {
          ...mockUserAchievement,
          progress: { login: 5, posts: 2 },
          isUnlocked: false,
        },
      ])

      const result = await service.getUserAchievements("user-1")

      expect(result[0].progressPercentage).toBe(35) // (5/10 + 2/5) / 2 * 100 = 35%
    })
  })

  describe("equipContent", () => {
    it("should equip content successfully", async () => {
      const userContent = {
        id: "user-content-1",
        userId: "user-1",
        contentId: "content-1",
        isEquipped: false,
        equippedAt: null,
        content: mockUnlockableContent,
      }

      userUnlockedContentRepository.findOne.mockResolvedValue(userContent as any)
      userUnlockedContentRepository.update.mockResolvedValue({ affected: 1 } as any)
      userUnlockedContentRepository.save.mockResolvedValue({
        ...userContent,
        isEquipped: true,
        equippedAt: new Date(),
      } as any)

      await service.equipContent("user-1", "content-1")

      expect(userUnlockedContentRepository.update).toHaveBeenCalledWith(
        { userId: "user-1", isEquipped: true },
        { isEquipped: false, equippedAt: null },
      )
      expect(userUnlockedContentRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          isEquipped: true,
          equippedAt: expect.any(Date),
        }),
      )
    })

    it("should throw NotFoundException when content not found", async () => {
      userUnlockedContentRepository.findOne.mockResolvedValue(null)

      await expect(service.equipContent("user-1", "content-1")).rejects.toThrow("Content not found or not unlocked")
    })
  })

  describe("getLeaderboard", () => {
    it("should return leaderboard data", async () => {
      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([mockUserAchievement]),
      }

      userAchievementRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder)

      const result = await service.getLeaderboard("achievement-1", 5)

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith("ua.achievementId = :achievementId", {
        achievementId: "achievement-1",
      })
      expect(mockQueryBuilder.limit).toHaveBeenCalledWith(5)
      expect(result).toEqual([mockUserAchievement])
    })
  })
})
