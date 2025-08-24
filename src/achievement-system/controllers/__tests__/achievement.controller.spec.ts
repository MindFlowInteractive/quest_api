import { Test, type TestingModule } from "@nestjs/testing"
import { NotFoundException } from "@nestjs/common"
import { AchievementController } from "../achievement.controller"
import { AchievementService } from "../../services/achievement.service"
import { AchievementType, AchievementRarity } from "../../entities"
import { jest } from "@jest/globals"

describe("AchievementController", () => {
  let controller: AchievementController
  let service: jest.Mocked<AchievementService>

  const mockAchievement = {
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

  const mockAchievementProgress = {
    achievement: mockAchievement,
    progress: { login: 1 },
    isUnlocked: true,
    progressPercentage: 100,
  }

  beforeEach(async () => {
    const mockService = {
      getAllAchievements: jest.fn(),
      getUserAchievements: jest.fn(),
      processUserAction: jest.fn(),
      getUserUnlockedContent: jest.fn(),
      equipContent: jest.fn(),
      getLeaderboard: jest.fn(),
    }

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AchievementController],
      providers: [
        {
          provide: AchievementService,
          useValue: mockService,
        },
      ],
    }).compile()

    controller = module.get<AchievementController>(AchievementController)
    service = module.get(AchievementService)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe("getAllAchievements", () => {
    it("should return all achievements", async () => {
      service.getAllAchievements.mockResolvedValue([mockAchievement])

      const result = await controller.getAllAchievements({ includeHidden: false })

      expect(service.getAllAchievements).toHaveBeenCalledWith(false)
      expect(result).toHaveLength(1)
      expect(result[0]).toMatchObject({
        id: "achievement-1",
        name: "Welcome Aboard",
        type: AchievementType.MILESTONE,
      })
    })
  })

  describe("getUserAchievements", () => {
    it("should return user achievement progress", async () => {
      service.getUserAchievements.mockResolvedValue([mockAchievementProgress])

      const result = await controller.getUserAchievements("user-1")

      expect(service.getUserAchievements).toHaveBeenCalledWith("user-1")
      expect(result).toHaveLength(1)
      expect(result[0]).toMatchObject({
        achievement: expect.objectContaining({ id: "achievement-1" }),
        progress: { login: 1 },
        isUnlocked: true,
        progressPercentage: 100,
      })
    })
  })

  describe("processUserAction", () => {
    it("should process user action and return unlocked achievements", async () => {
      const userActionDto = {
        userId: "user-1",
        action: "login",
        value: 1,
        metadata: {},
      }

      const unlockedAchievements = [
        {
          ...mockAchievement,
          unlockableContents: [
            {
              id: "content-1",
              name: "Welcome Badge",
              type: "badge",
            },
          ],
        },
      ]

      service.processUserAction.mockResolvedValue(unlockedAchievements)

      const result = await controller.processUserAction(userActionDto)

      expect(service.processUserAction).toHaveBeenCalledWith(userActionDto)
      expect(result).toMatchObject({
        unlockedAchievements: [
          {
            id: "achievement-1",
            name: "Welcome Aboard",
            points: 10,
            rarity: AchievementRarity.COMMON,
          },
        ],
        totalPointsEarned: 10,
        newContentUnlocked: [
          {
            id: "content-1",
            name: "Welcome Badge",
            type: "badge",
          },
        ],
      })
    })

    it("should handle empty unlocked achievements", async () => {
      const userActionDto = {
        userId: "user-1",
        action: "login",
        value: 1,
        metadata: {},
      }

      service.processUserAction.mockResolvedValue([])

      const result = await controller.processUserAction(userActionDto)

      expect(result).toMatchObject({
        unlockedAchievements: [],
        totalPointsEarned: 0,
        newContentUnlocked: [],
      })
    })
  })

  describe("equipContent", () => {
    it("should equip content successfully", async () => {
      service.equipContent.mockResolvedValue()

      const result = await controller.equipContent("user-1", { contentId: "content-1" })

      expect(service.equipContent).toHaveBeenCalledWith("user-1", "content-1")
      expect(result).toEqual({ message: "Content equipped successfully" })
    })

    it("should handle NotFoundException", async () => {
      service.equipContent.mockRejectedValue(new NotFoundException("Content not found"))

      await expect(controller.equipContent("user-1", { contentId: "content-1" })).rejects.toThrow(
        "Content not found or not unlocked by user",
      )
    })
  })

  describe("getUserStats", () => {
    it("should return user statistics", async () => {
      const mockUserAchievements = [
        { ...mockAchievementProgress, isUnlocked: true },
        { ...mockAchievementProgress, isUnlocked: false, achievement: { ...mockAchievement, points: 20 } },
      ]

      const mockUnlockedContent = [
        { id: "uc-1", isEquipped: true },
        { id: "uc-2", isEquipped: false },
      ]

      service.getUserAchievements.mockResolvedValue(mockUserAchievements)
      service.getUserUnlockedContent.mockResolvedValue(mockUnlockedContent as any)

      const result = await controller.getUserStats("user-1")

      expect(result).toMatchObject({
        totalAchievements: 2,
        unlockedAchievements: 1,
        completionPercentage: 50,
        totalPoints: 10,
        totalUnlockedContent: 2,
        equippedContent: 1,
        rarityBreakdown: {
          common: 1,
        },
      })
    })
  })

  describe("getLeaderboard", () => {
    it("should return leaderboard data", async () => {
      const mockLeaderboard = [
        { id: "ua-1", userId: "user-1", unlockedAt: new Date() },
        { id: "ua-2", userId: "user-2", unlockedAt: new Date() },
      ]

      service.getLeaderboard.mockResolvedValue(mockLeaderboard)

      const result = await controller.getLeaderboard({ achievementId: "achievement-1", limit: 10 })

      expect(service.getLeaderboard).toHaveBeenCalledWith("achievement-1", 10)
      expect(result).toEqual(mockLeaderboard)
    })
  })
})
