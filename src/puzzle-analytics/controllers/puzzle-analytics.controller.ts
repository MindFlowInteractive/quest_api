import { Controller, Get, Post, Put, Param, Query, BadRequestException } from "@nestjs/common"
import type { PuzzleAnalyticsService } from "../services/puzzle-analytics.service"
import type { CreatePuzzleAnalyticsDto } from "../dto/create-puzzle-analytics.dto"
import type { PuzzleStatsDto, UserStatsDto, AnalyticsOverviewDto } from "../dto/puzzle-stats.dto"
import type { PuzzleAnalytics } from "../entities/puzzle-analytics.entity"

@Controller("puzzle-analytics")
export class PuzzleAnalyticsController {
  constructor(private readonly puzzleAnalyticsService: PuzzleAnalyticsService) {}

  @Post("attempt")
  async recordAttempt(createDto: CreatePuzzleAnalyticsDto): Promise<{ success: boolean; data: PuzzleAnalytics }> {
    const result = await this.puzzleAnalyticsService.recordPuzzleAttempt(createDto)
    return {
      success: true,
      data: result,
    }
  }

  @Put("complete")
  async recordCompletion(body: {
    puzzleId: string
    userId: string
    completionData: Partial<CreatePuzzleAnalyticsDto>
  }): Promise<{ success: boolean; data: PuzzleAnalytics }> {
    const { puzzleId, userId, completionData } = body

    if (!puzzleId || !userId) {
      throw new BadRequestException("puzzleId and userId are required")
    }

    const result = await this.puzzleAnalyticsService.updatePuzzleCompletion(puzzleId, userId, completionData)
    return {
      success: true,
      data: result,
    }
  }

  @Get("puzzle/:puzzleId/stats")
  async getPuzzleStats(@Param("puzzleId") puzzleId: string): Promise<{ success: boolean; data: PuzzleStatsDto }> {
    const stats = await this.puzzleAnalyticsService.getPuzzleStats(puzzleId)
    return {
      success: true,
      data: stats,
    }
  }

  @Get("user/:userId/stats")
  async getUserStats(@Param("userId") userId: string): Promise<{ success: boolean; data: UserStatsDto }> {
    const stats = await this.puzzleAnalyticsService.getUserStats(userId)
    return {
      success: true,
      data: stats,
    }
  }

  @Get("overview")
  async getAnalyticsOverview(): Promise<{ success: boolean; data: AnalyticsOverviewDto }> {
    const overview = await this.puzzleAnalyticsService.getAnalyticsOverview()
    return {
      success: true,
      data: overview,
    }
  }

  @Get("top-puzzles")
  async getTopPerformingPuzzles(@Query("limit") limit?: string): Promise<{ success: boolean; data: PuzzleStatsDto[] }> {
    const parsedLimit = limit ? Number.parseInt(limit, 10) : 10

    if (parsedLimit < 1 || parsedLimit > 100) {
      throw new BadRequestException("Limit must be between 1 and 100")
    }

    const topPuzzles = await this.puzzleAnalyticsService.getTopPerformingPuzzles(parsedLimit)
    return {
      success: true,
      data: topPuzzles,
    }
  }

  @Get("puzzle/:puzzleId/date-range")
  async getPuzzleAnalyticsByDateRange(
    @Param("puzzleId") puzzleId: string,
    @Query("startDate") startDate: string,
    @Query("endDate") endDate: string,
  ): Promise<{ success: boolean; data: PuzzleAnalytics[] }> {
    if (!startDate || !endDate) {
      throw new BadRequestException("startDate and endDate query parameters are required")
    }

    const start = new Date(startDate)
    const end = new Date(endDate)

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      throw new BadRequestException("Invalid date format. Use ISO 8601 format (YYYY-MM-DD)")
    }

    if (start >= end) {
      throw new BadRequestException("startDate must be before endDate")
    }

    const analytics = await this.puzzleAnalyticsService.getPuzzleAnalyticsByDateRange(puzzleId, start, end)
    return {
      success: true,
      data: analytics,
    }
  }

  @Get("puzzle/:puzzleId/leaderboard")
  async getPuzzleLeaderboard(
    @Param("puzzleId") puzzleId: string,
    @Query("limit") limit?: string,
  ): Promise<{ success: boolean; data: any[] }> {
    const parsedLimit = limit ? Number.parseInt(limit, 10) : 10

    if (parsedLimit < 1 || parsedLimit > 50) {
      throw new BadRequestException("Limit must be between 1 and 50")
    }

    return {
      success: true,
      data: [],
    }
  }

  @Get("health")
  async healthCheck(): Promise<{ success: boolean; message: string; timestamp: string }> {
    return {
      success: true,
      message: "Puzzle Analytics service is running",
      timestamp: new Date().toISOString(),
    }
  }
}
