import { Test, type TestingModule } from "@nestjs/testing"
import { getRepositoryToken } from "@nestjs/typeorm"
import type { Repository } from "typeorm"
import { BadRequestException } from "@nestjs/common"
import { UnlockableContentService } from "../unlockable-content.service"
import { UnlockableContent, UserUnlockedContent, Achievement, ContentType, AchievementRarity } from "../../entities"
import { jest } from "@jest/globals"

describe("UnlockableContentService", () => {
  let service: UnlockableContentService
  let unlockableContentRepository: jest.Mocked<Repository<UnlockableContent>>
  let userUnlockedContentRepository: jest.Mocked<Repository<UserUnlockedContent>>
  let achievementRepository: jest.Mocked<Repository<Achievement>>

  const mockContent: UnlockableContent = {
    id: "content-1",
    name: "Test Badge",
    description: "A test badge",
    type: ContentType.BADGE,
    contentData: { badgeColor: "#4CAF50", icon: "test" },
    imageUrl: null,
    achievementId: "achievement-1",
    isActive: true,
    expiresAt: null,
    sortOrder: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
    achievement: null,
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
        UnlockableContentService,
        {
          provide: getRepositoryToken(UnlockableContent),
          useValue: mockRepository,
        },
        {
          provide: getRepositoryToken(UserUnlockedContent),
          useValue: mockRepository,
        },
        {
          provide: getRepositoryToken(Achievement),
          useValue: mockRepository,
        },
      ],
    }).compile()

    service = module.get<UnlockableContentService>(UnlockableContentService)
    unlockableContentRepository = module.get(getRepositoryToken(UnlockableContent))
    userUnlockedContentRepository = module.get(getRepositoryToken(UserUnlockedContent))
    achievementRepository = module.get(getRepositoryToken(Achievement))
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe("createContent", () => {
    it("should create content successfully", async () => {
      const createDto = {
        name: "Test Badge",
        description: "A test badge",
        type: ContentType.BADGE,
        contentData: { badgeColor: "#4CAF50", icon: "test" },
        achievementId: "achievement-1",
      }

      achievementRepository.findOne.mockResolvedValue({} as any)
      unlockableContentRepository.create.mockReturnValue(mockContent)
      unlockableContentRepository.save.mockResolvedValue(mockContent)

      const result = await service.createContent(createDto)

      expect(achievementRepository.findOne).toHaveBeenCalledWith({ where: { id: "achievement-1" } })
      expect(unlockableContentRepository.create).toHaveBeenCalledWith(createDto)
      expect(result).toEqual(mockContent)
    })

    it("should throw NotFoundException when achievement not found", async () => {
      const createDto = {
        name: "Test Badge",
        description: "A test badge",
        type: ContentType.BADGE,
        contentData: { badgeColor: "#4CAF50", icon: "test" },
        achievementId: "achievement-1",
      }

      achievementRepository.findOne.mockResolvedValue(null)

      await expect(service.createContent(createDto)).rejects.toThrow("Achievement not found")
    })

    it("should validate badge content data", async () => {
      const createDto = {
        name: "Test Badge",
        description: "A test badge",
        type: ContentType.BADGE,
        contentData: { icon: "test" }, // Missing badgeColor
      }

      await expect(service.createContent(createDto)).rejects.toThrow(BadRequestException)
    })

    it("should validate theme content data", async () => {
      const createDto = {
        name: "Test Theme",
        description: "A test theme",
        type: ContentType.THEME,
        contentData: { themeName: "test" }, // Missing primaryColor
      }

      await expect(service.createContent(createDto)).rejects.toThrow(BadRequestException)
    })

    it("should validate currency content data", async () => {
      const createDto = {
        name: "Test Currency",
        description: "Test currency reward",
        type: ContentType.CURRENCY,
        contentData: { amount: "invalid" }, // Should be number
      }

      await expect(service.createContent(createDto)).rejects.toThrow(BadRequestException)
    })
  })

  describe("getAllContent", () => {
    it("should return filtered content", async () => {
      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([mockContent]),
      }

      unlockableContentRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder)

      const filter = { type: ContentType.BADGE, isActive: true }
      const result = await service.getAllContent(filter)

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith("content.type = :type", { type: ContentType.BADGE })
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith("content.isActive = :isActive", { isActive: true })
      expect(result).toEqual([mockContent])
    })

    it("should filter expired content", async () => {
      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      }

      unlockableContentRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder)

      await service.getAllContent({ isExpired: false })

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        "(content.expiresAt IS NULL OR content.expiresAt > :now)",
        { now: expect.any(Date) },
      )
    })
  })

  describe("getContentRecommendations", () => {
    it("should return content recommendations", async () => {
      const userContent = [
        {
          id: "uc-1",
          userId: "user-1",
          contentId: "content-1",
          content: {
            ...mockContent,
            type: ContentType.BADGE,
            achievement: {
              id: "achievement-1",
              category: "Social",
              rarity: AchievementRarity.COMMON,
            },
          },
        },
      ]

      const availableContent = [
        {
          ...mockContent,
          id: "content-2",
          type: ContentType.BADGE,
          achievement: {
            id: "achievement-2",
            category: "Social",
            rarity: AchievementRarity.RARE,
          },
        },
      ]

      userUnlockedContentRepository.find.mockResolvedValue(userContent as any)
      unlockableContentRepository.createQueryBuilder.mockReturnValue({
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(availableContent),
      })

      const result = await service.getContentRecommendations("user-1", 3)

      expect(result).toHaveLength(1)
      expect(result[0]).toHaveProperty("content")
      expect(result[0]).toHaveProperty("score")
      expect(result[0]).toHaveProperty("reason")
      expect(result[0].score).toBeGreaterThan(0)
    })
  })

  describe("expireContent", () => {
    it("should expire content successfully", async () => {
      unlockableContentRepository.update.mockResolvedValue({ affected: 3 } as any)

      const result = await service.expireContent()

      expect(result).toBe(3)
      expect(unlockableContentRepository.update).toHaveBeenCalledWith(
        { expiresAt: { $lte: expect.any(Date) }, isActive: true },
        { isActive: false },
      )
    })
  })

  describe("getContentStats", () => {
    it("should return content statistics", async () => {
      unlockableContentRepository.count
        .mockResolvedValueOnce(100) // totalContent
        .mockResolvedValueOnce(80) // activeContent
        .mockResolvedValueOnce(5) // expiredContent

      unlockableContentRepository.createQueryBuilder
        .mockReturnValueOnce({
          select: jest.fn().mockReturnThis(),
          addSelect: jest.fn().mockReturnThis(),
          groupBy: jest.fn().mockReturnThis(),
          getRawMany: jest.fn().mockResolvedValue([
            { type: "badge", count: "50" },
            { type: "avatar", count: "30" },
          ]),
        })
        .mockReturnValueOnce({
          leftJoin: jest.fn().mockReturnThis(),
          select: jest.fn().mockReturnThis(),
          addSelect: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          groupBy: jest.fn().mockReturnThis(),
          getRawMany: jest.fn().mockResolvedValue([
            { category: "Social", count: "40" },
            { category: "Gaming", count: "35" },
          ]),
        })

      const result = await service.getContentStats()

      expect(result).toEqual({
        totalContent: 100,
        activeContent: 80,
        expiredContent: 5,
        contentByType: {
          badge: 50,
          avatar: 30,
        },
        contentByCategory: {
          Social: 40,
          Gaming: 35,
        },
      })
    })
  })

  describe("bulkCreateContent", () => {
    it("should create multiple content items", async () => {
      const contentList = [
        {
          name: "Badge 1",
          description: "First badge",
          type: ContentType.BADGE,
          contentData: { badgeColor: "#4CAF50", icon: "test1" },
        },
        {
          name: "Badge 2",
          description: "Second badge",
          type: ContentType.BADGE,
          contentData: { badgeColor: "#2196F3", icon: "test2" },
        },
      ]

      unlockableContentRepository.create.mockReturnValue(mockContent)
      unlockableContentRepository.save.mockResolvedValue(mockContent)

      const result = await service.bulkCreateContent(contentList)

      expect(result).toHaveLength(2)
      expect(unlockableContentRepository.save).toHaveBeenCalledTimes(2)
    })
  })
})
