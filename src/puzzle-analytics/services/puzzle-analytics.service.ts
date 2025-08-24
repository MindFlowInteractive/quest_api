import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common"
import { type Repository, MoreThanOrEqual, LessThanOrEqual } from "typeorm"
import type { PuzzleAnalytics } from "../entities/puzzle-analytics.entity"
import type { CreatePuzzleAnalyticsDto } from "../dto/create-puzzle-analytics.dto"
import type { PuzzleStatsDto, UserStatsDto, AnalyticsOverviewDto } from "../dto/puzzle-stats.dto"

@Injectable()
export class PuzzleAnalyticsService {
  constructor(private readonly puzzleAnalyticsRepository: Repository<PuzzleAnalytics>) {}

  async recordPuzzleAttempt(createDto: CreatePuzzleAnalyticsDto): Promise<PuzzleAnalytics> {
    try {
      const analytics = this.puzzleAnalyticsRepository.create({
        ...createDto,
        completedAt: createDto.isCompleted ? new Date() : null,
      })

      return await this.puzzleAnalyticsRepository.save(analytics)
    } catch (error) {
      throw new BadRequestException("Failed to record puzzle attempt")
    }
  }

  async updatePuzzleCompletion(
    puzzleId: string,
    userId: string,
    completionData: Partial<CreatePuzzleAnalyticsDto>,
  ): Promise<PuzzleAnalytics> {
    const existingRecord = await this.puzzleAnalyticsRepository.findOne({
      where: { puzzleId, userId, isCompleted: false },
      order: { createdAt: "DESC" },
    })

    if (!existingRecord) {
      throw new NotFoundException("No active puzzle attempt found")
    }

    Object.assign(existingRecord, {
      ...completionData,
      isCompleted: true,
      completedAt: new Date(),
    })

    return await this.puzzleAnalyticsRepository.save(existingRecord)
  }

  async getPuzzleStats(puzzleId: string): Promise<PuzzleStatsDto> {
    const stats = await this.puzzleAnalyticsRepository
      .createQueryBuilder("analytics")
      .select([
        "COUNT(*) as totalAttempts",
        "COUNT(CASE WHEN analytics.isCompleted = true THEN 1 END) as totalCompletions",
        "AVG(CASE WHEN analytics.isCompleted = true THEN analytics.completionTimeMs END) as avgCompletionTime",
        "AVG(CASE WHEN analytics.isCompleted = true THEN analytics.score END) as avgScore",
        "AVG(analytics.difficultyRating) as avgDifficulty",
        "AVG(analytics.hintsUsed) as avgHintsUsed",
      ])
      .where("analytics.puzzleId = :puzzleId", { puzzleId })
      .getRawOne()

    const totalAttempts = Number.parseInt(stats.totalAttempts) || 0
    const totalCompletions = Number.parseInt(stats.totalCompletions) || 0

    return {
      puzzleId,
      totalAttempts,
      totalCompletions,
      completionRate: totalAttempts > 0 ? (totalCompletions / totalAttempts) * 100 : 0,
      averageCompletionTime: stats.avgCompletionTime ? Number.parseFloat(stats.avgCompletionTime) : null,
      averageScore: stats.avgScore ? Number.parseFloat(stats.avgScore) : null,
      averageDifficulty: stats.avgDifficulty ? Number.parseFloat(stats.avgDifficulty) : null,
      averageHintsUsed: Number.parseFloat(stats.avgHintsUsed) || 0,
    }
  }

  async getUserStats(userId: string): Promise<UserStatsDto> {
    const stats = await this.puzzleAnalyticsRepository
      .createQueryBuilder("analytics")
      .select([
        "COUNT(DISTINCT CASE WHEN analytics.isCompleted = true THEN analytics.puzzleId END) as totalSolved",
        "COUNT(*) as totalAttempts",
        "AVG(CASE WHEN analytics.isCompleted = true THEN analytics.completionTimeMs END) as avgCompletionTime",
        "AVG(CASE WHEN analytics.isCompleted = true THEN analytics.score END) as avgScore",
        "SUM(analytics.hintsUsed) as totalHintsUsed",
        "COUNT(CASE WHEN analytics.isCompleted = true THEN 1 END) as totalCompletions",
      ])
      .where("analytics.userId = :userId", { userId })
      .getRawOne()

    const totalAttempts = Number.parseInt(stats.totalAttempts) || 0
    const totalCompletions = Number.parseInt(stats.totalCompletions) || 0

    return {
      userId,
      totalPuzzlesSolved: Number.parseInt(stats.totalSolved) || 0,
      totalAttempts,
      averageCompletionTime: stats.avgCompletionTime ? Number.parseFloat(stats.avgCompletionTime) : null,
      averageScore: stats.avgScore ? Number.parseFloat(stats.avgScore) : null,
      totalHintsUsed: Number.parseInt(stats.totalHintsUsed) || 0,
      completionRate: totalAttempts > 0 ? (totalCompletions / totalAttempts) * 100 : 0,
    }
  }

  async getAnalyticsOverview(): Promise<AnalyticsOverviewDto> {
    const stats = await this.puzzleAnalyticsRepository
      .createQueryBuilder("analytics")
      .select([
        "COUNT(DISTINCT analytics.userId) as totalUsers",
        "COUNT(DISTINCT analytics.puzzleId) as totalPuzzles",
        "COUNT(*) as totalAttempts",
        "COUNT(CASE WHEN analytics.isCompleted = true THEN 1 END) as totalCompletions",
        "AVG(CASE WHEN analytics.isCompleted = true THEN analytics.completionTimeMs END) as avgCompletionTime",
      ])
      .getRawOne()

    const totalAttempts = Number.parseInt(stats.totalAttempts) || 0
    const totalCompletions = Number.parseInt(stats.totalCompletions) || 0

    return {
      totalUsers: Number.parseInt(stats.totalUsers) || 0,
      totalPuzzles: Number.parseInt(stats.totalPuzzles) || 0,
      totalAttempts,
      totalCompletions,
      overallCompletionRate: totalAttempts > 0 ? (totalCompletions / totalAttempts) * 100 : 0,
      averageCompletionTime: stats.avgCompletionTime ? Number.parseFloat(stats.avgCompletionTime) : null,
    }
  }

  async getPuzzleAnalyticsByDateRange(puzzleId: string, startDate: Date, endDate: Date): Promise<PuzzleAnalytics[]> {
    return await this.puzzleAnalyticsRepository.find({
      where: {
        puzzleId,
        createdAt: MoreThanOrEqual(startDate) as any,
        updatedAt: LessThanOrEqual(endDate) as any,
      },
      order: { createdAt: "DESC" },
    })
  }

  async getTopPerformingPuzzles(limit = 10): Promise<PuzzleStatsDto[]> {
    const puzzles = await this.puzzleAnalyticsRepository
      .createQueryBuilder("analytics")
      .select("analytics.puzzleId")
      .groupBy("analytics.puzzleId")
      .orderBy("COUNT(CASE WHEN analytics.isCompleted = true THEN 1 END)", "DESC")
      .limit(limit)
      .getRawMany()

    const results = []
    for (const puzzle of puzzles) {
      const stats = await this.getPuzzleStats(puzzle.analytics_puzzle_id)
      results.push(stats)
    }

    return results
  }
}
