import { Test, type TestingModule } from "@nestjs/testing"
import { getRepositoryToken } from "@nestjs/typeorm"
import type { Repository } from "typeorm"
import { BadRequestException, NotFoundException } from "@nestjs/common"
import { PuzzleAnalyticsService } from "./puzzle-analytics.service"
import { PuzzleAnalytics } from "../entities/puzzle-analytics.entity"
import type { CreatePuzzleAnalyticsDto } from "../dto/create-puzzle-analytics.dto"
import { jest } from "@jest/globals"

describe("PuzzleAnalyticsService", () => {
  let service: PuzzleAnalyticsService
  let repository: jest.Mocked<Repository<PuzzleAnalytics>>

  const mockRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    createQueryBuilder: jest.fn(),
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PuzzleAnalyticsService,
        {
          provide: getRepositoryToken(PuzzleAnalytics),
          useValue: mockRepository,
        },
      ],
    }).compile()

    service = module.get<PuzzleAnalyticsService>(PuzzleAnalyticsService)
    repository = module.get(getRepositoryToken(PuzzleAnalytics))

    // Reset all mocks before each test
    jest.clearAllMocks()
  })

  describe("recordPuzzleAttempt", () => {
    it("should successfully record a puzzle attempt", async () => {
      const createDto: CreatePuzzleAnalyticsDto = {
        puzzleId: "puzzle-123",
        userId: "user-456",
        attemptsCount: 1,
        hintsUsed: 2,
      }

      const mockAnalytics = {
        id: "analytics-789",
        ...createDto,
        isCompleted: false,
        completedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as PuzzleAnalytics

      repository.create.mockReturnValue(mockAnalytics)
      repository.save.mockResolvedValue(mockAnalytics)

      const result = await service.recordPuzzleAttempt(createDto)

      expect(repository.create).toHaveBeenCalledWith({
        ...createDto,
        completedAt: null,
      })
      expect(repository.save).toHaveBeenCalledWith(mockAnalytics)
      expect(result).toEqual(mockAnalytics)
    })

    it("should record completed puzzle attempt with completion date", async () => {
      const createDto: CreatePuzzleAnalyticsDto = {
        puzzleId: "puzzle-123",
        userId: "user-456",
        isCompleted: true,
        completionTimeMs: 30000,
      }

      const mockAnalytics = {
        id: "analytics-789",
        ...createDto,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as PuzzleAnalytics

      repository.create.mockReturnValue(mockAnalytics)
      repository.save.mockResolvedValue(mockAnalytics)

      await service.recordPuzzleAttempt(createDto)

      expect(repository.create).toHaveBeenCalledWith({
        ...createDto,
        completedAt: expect.any(Date),
      })
    })

    it("should throw BadRequestException when save fails", async () => {
      const createDto: CreatePuzzleAnalyticsDto = {
        puzzleId: "puzzle-123",
        userId: "user-456",
      }

      repository.create.mockReturnValue({} as PuzzleAnalytics)
      repository.save.mockRejectedValue(new Error("Database error"))

      await expect(service.recordPuzzleAttempt(createDto)).rejects.toThrow(BadRequestException)
    })
  })

  describe("updatePuzzleCompletion", () => {
    it("should successfully update puzzle completion", async () => {
      const puzzleId = "puzzle-123"
      const userId = "user-456"
      const completionData = {
        completionTimeMs: 45000,
        score: 100,
      }

      const existingRecord = {
        id: "analytics-789",
        puzzleId,
        userId,
        isCompleted: false,
        createdAt: new Date(),
      } as PuzzleAnalytics

      const updatedRecord = {
        ...existingRecord,
        ...completionData,
        isCompleted: true,
        completedAt: expect.any(Date),
      } as PuzzleAnalytics

      repository.findOne.mockResolvedValue(existingRecord)
      repository.save.mockResolvedValue(updatedRecord)

      const result = await service.updatePuzzleCompletion(puzzleId, userId, completionData)

      expect(repository.findOne).toHaveBeenCalledWith({
        where: { puzzleId, userId, isCompleted: false },
        order: { createdAt: "DESC" },
      })
      expect(repository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          ...completionData,
          isCompleted: true,
          completedAt: expect.any(Date),
        }),
      )
      expect(result).toEqual(updatedRecord)
    })

    it("should throw NotFoundException when no active attempt found", async () => {
      repository.findOne.mockResolvedValue(null)

      await expect(service.updatePuzzleCompletion("puzzle-123", "user-456", {})).rejects.toThrow(NotFoundException)
    })
  })

  describe("getPuzzleStats", () => {
    it("should return puzzle statistics", async () => {
      const puzzleId = "puzzle-123"
      const mockStats = {
        totalAttempts: "10",
        totalCompletions: "7",
        avgCompletionTime: "35000.5",
        avgScore: "85.2",
        avgDifficulty: "3.5",
        avgHintsUsed: "2.1",
      }

      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue(mockStats),
      }

      repository.createQueryBuilder.mockReturnValue(mockQueryBuilder)

      const result = await service.getPuzzleStats(puzzleId)

      expect(result).toEqual({
        puzzleId,
        totalAttempts: 10,
        totalCompletions: 7,
        completionRate: 70,
        averageCompletionTime: 35000.5,
        averageScore: 85.2,
        averageDifficulty: 3.5,
        averageHintsUsed: 2.1,
      })
    })

    it("should handle zero attempts correctly", async () => {
      const puzzleId = "puzzle-123"
      const mockStats = {
        totalAttempts: "0",
        totalCompletions: "0",
        avgCompletionTime: null,
        avgScore: null,
        avgDifficulty: null,
        avgHintsUsed: "0",
      }

      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue(mockStats),
      }

      repository.createQueryBuilder.mockReturnValue(mockQueryBuilder)

      const result = await service.getPuzzleStats(puzzleId)

      expect(result.completionRate).toBe(0)
      expect(result.averageCompletionTime).toBeNull()
      expect(result.averageScore).toBeNull()
    })
  })

  describe("getUserStats", () => {
    it("should return user statistics", async () => {
      const userId = "user-456"
      const mockStats = {
        totalSolved: "5",
        totalAttempts: "8",
        avgCompletionTime: "42000.0",
        avgScore: "78.5",
        totalHintsUsed: "12",
        totalCompletions: "5",
      }

      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue(mockStats),
      }

      repository.createQueryBuilder.mockReturnValue(mockQueryBuilder)

      const result = await service.getUserStats(userId)

      expect(result).toEqual({
        userId,
        totalPuzzlesSolved: 5,
        totalAttempts: 8,
        averageCompletionTime: 42000.0,
        averageScore: 78.5,
        totalHintsUsed: 12,
        completionRate: 62.5,
      })
    })
  })

  describe("getAnalyticsOverview", () => {
    it("should return analytics overview", async () => {
      const mockStats = {
        totalUsers: "25",
        totalPuzzles: "15",
        totalAttempts: "150",
        totalCompletions: "120",
        avgCompletionTime: "38000.0",
      }

      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue(mockStats),
      }

      repository.createQueryBuilder.mockReturnValue(mockQueryBuilder)

      const result = await service.getAnalyticsOverview()

      expect(result).toEqual({
        totalUsers: 25,
        totalPuzzles: 15,
        totalAttempts: 150,
        totalCompletions: 120,
        overallCompletionRate: 80,
        averageCompletionTime: 38000.0,
      })
    })
  })

  describe("getPuzzleAnalyticsByDateRange", () => {
    it("should return analytics within date range", async () => {
      const puzzleId = "puzzle-123"
      const startDate = new Date("2024-01-01")
      const endDate = new Date("2024-01-31")
      const mockAnalytics = [
        { id: "1", puzzleId, createdAt: new Date("2024-01-15") },
        { id: "2", puzzleId, createdAt: new Date("2024-01-20") },
      ] as PuzzleAnalytics[]

      repository.find.mockResolvedValue(mockAnalytics)

      const result = await service.getPuzzleAnalyticsByDateRange(puzzleId, startDate, endDate)

      expect(repository.find).toHaveBeenCalledWith({
        where: {
          puzzleId,
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
        },
        order: { createdAt: "DESC" },
      })
      expect(result).toEqual(mockAnalytics)
    })
  })

  describe("getTopPerformingPuzzles", () => {
    it("should return top performing puzzles", async () => {
      const mockPuzzles = [{ analytics_puzzle_id: "puzzle-123" }, { analytics_puzzle_id: "puzzle-456" }]

      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue(mockPuzzles),
      }

      repository.createQueryBuilder.mockReturnValue(mockQueryBuilder)

      // Mock getPuzzleStats calls
      const mockStatsQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({
          totalAttempts: "10",
          totalCompletions: "8",
          avgCompletionTime: "30000",
          avgScore: "90",
          avgDifficulty: "4",
          avgHintsUsed: "1",
        }),
      }

      repository.createQueryBuilder.mockReturnValue(mockStatsQueryBuilder)

      const result = await service.getTopPerformingPuzzles(2)

      expect(result).toHaveLength(2)
      expect(result[0].puzzleId).toBe("puzzle-123")
      expect(result[1].puzzleId).toBe("puzzle-456")
    })
  })
})
