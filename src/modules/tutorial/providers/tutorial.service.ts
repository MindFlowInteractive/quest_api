import { Injectable, Logger, NotFoundException } from "@nestjs/common"
import { InjectRepository } from "@nestjs/typeorm"
import {  Repository, In } from "typeorm"
import { Tutorial, TutorialCategory, TutorialDifficulty } from "../entities/tutorial.entity"
import { TutorialStep } from "../entities/tutorial-step.entity"
import { ProgressStatus, TutorialProgress } from "../entities/utorial-progress.entity"
import { TutorialProgressService } from "./tutorial-progress.service"
import { CreateTutorialDto, CreateTutorialStepDto, TutorialSearchDto } from "../dto/create-tutorial.dto"


@Injectable()
export class TutorialService {
  private readonly logger = new Logger(TutorialService.name);

  constructor(
    @InjectRepository(Tutorial)
    private readonly tutorialRepository: Repository<Tutorial>,
    @InjectRepository(TutorialStep)
    private readonly stepRepository: Repository<TutorialStep>,
    @InjectRepository(TutorialProgress)
    private readonly progressRepository: Repository<TutorialProgress>,
    private readonly progressService: TutorialProgressService,
  ) {}

  async createTutorial(createDto: CreateTutorialDto): Promise<Tutorial> {
    const tutorial = this.tutorialRepository.create(createDto)
    return this.tutorialRepository.save(tutorial)
  }

  async addStepToTutorial(tutorialId: string, stepDto: CreateTutorialStepDto): Promise<TutorialStep> {
    const tutorial = await this.getTutorialById(tutorialId)

    const step = this.stepRepository.create({
      ...stepDto,
      tutorialId: tutorial.id,
    })

    return this.stepRepository.save(step)
  }

  async getTutorialById(id: string): Promise<Tutorial> {
    const tutorial = await this.tutorialRepository.findOne({
      where: { id },
      relations: ["steps"],
    })

    if (!tutorial) {
      throw new NotFoundException("Tutorial not found")
    }

    return tutorial
  }

  async getTutorialWithProgress(
    tutorialId: string,
    userId: string,
  ): Promise<{
    tutorial: Tutorial
    progress: TutorialProgress | null
  }> {
    const tutorial = await this.getTutorialById(tutorialId)
    const progress = await this.progressService.getUserProgress(userId, tutorialId)

    return { tutorial, progress }
  }

  async searchTutorials(searchDto: TutorialSearchDto): Promise<{
    tutorials: Tutorial[]
    total: number
    page: number
    limit: number
  }> {
    const {
      query,
      category,
      difficulty,
      type,
      tags,
      page = 1,
      limit = 20,
      sortBy = "orderIndex",
      sortOrder = "ASC",
    } = searchDto

    const queryBuilder = this.tutorialRepository
      .createQueryBuilder("tutorial")
      .where("tutorial.isActive = :isActive", { isActive: true })

    if (query) {
      queryBuilder.andWhere("(tutorial.title ILIKE :query OR tutorial.description ILIKE :query)", {
        query: `%${query}%`,
      })
    }

    if (category) {
      queryBuilder.andWhere("tutorial.category = :category", { category })
    }

    if (difficulty) {
      queryBuilder.andWhere("tutorial.difficulty = :difficulty", { difficulty })
    }

    if (type) {
      queryBuilder.andWhere("tutorial.type = :type", { type })
    }

    if (tags && tags.length > 0) {
      queryBuilder.andWhere("tutorial.tags && :tags", { tags })
    }

    queryBuilder.orderBy(`tutorial.${sortBy}`, sortOrder)

    const offset = (page - 1) * limit
    queryBuilder.skip(offset).take(limit)

    const [tutorials, total] = await queryBuilder.getManyAndCount()

    return {
      tutorials,
      total,
      page,
      limit,
    }
  }

  async getRecommendedTutorials(userId: string, maxRecommendations = 5, includeCompleted = false): Promise<Tutorial[]> {
    // Get user's completed tutorials
    const userProgress = await this.progressRepository.find({
      where: { userId },
      relations: ["tutorial"],
    })

    const completedTutorialIds = userProgress
      .filter((p) => p.status === ProgressStatus.COMPLETED)
      .map((p) => p.tutorialId)

    const inProgressTutorialIds = userProgress
      .filter((p) => p.status === ProgressStatus.IN_PROGRESS)
      .map((p) => p.tutorialId)

    // Build recommendation query
    const queryBuilder = this.tutorialRepository
      .createQueryBuilder("tutorial")
      .where("tutorial.isActive = :isActive", { isActive: true })

    if (!includeCompleted && completedTutorialIds.length > 0) {
      queryBuilder.andWhere("tutorial.id NOT IN (:...completedIds)", {
        completedIds: completedTutorialIds,
      })
    }

    // Prioritize tutorials in progress
    if (inProgressTutorialIds.length > 0) {
      queryBuilder.addSelect(`CASE WHEN tutorial.id IN (:...inProgressIds) THEN 0 ELSE 1 END`, "priority")
      queryBuilder.setParameter("inProgressIds", inProgressTutorialIds)
    }

    // Get user's skill level based on completed tutorials
    const userLevel = await this.calculateUserLevel(userId)

    // Recommend tutorials appropriate for user level
    queryBuilder.andWhere("tutorial.difficulty IN (:...difficulties)", {
      difficulties: this.getAppropriatedifficulties(userLevel),
    })

    queryBuilder.orderBy("priority", "ASC").addOrderBy("tutorial.orderIndex", "ASC").limit(maxRecommendations)

    return queryBuilder.getMany()
  }

  async getTutorialsByCategory(category: TutorialCategory): Promise<Tutorial[]> {
    return this.tutorialRepository.find({
      where: { category, isActive: true },
      order: { orderIndex: "ASC" },
      relations: ["steps"],
    })
  }

  async getPrerequisites(tutorialId: string): Promise<Tutorial[]> {
    const tutorial = await this.getTutorialById(tutorialId)

    if (!tutorial.prerequisites || tutorial.prerequisites.length === 0) {
      return []
    }

    return this.tutorialRepository.find({
      where: { id: In(tutorial.prerequisites) },
      order: { orderIndex: "ASC" },
    })
  }

  async checkPrerequisites(
    tutorialId: string,
    userId: string,
  ): Promise<{
    canStart: boolean
    missingPrerequisites: Tutorial[]
  }> {
    const prerequisites = await this.getPrerequisites(tutorialId)

    if (prerequisites.length === 0) {
      return { canStart: true, missingPrerequisites: [] }
    }

    const userProgress = await this.progressRepository.find({
      where: {
        userId,
        tutorialId: In(prerequisites.map((p) => p.id)),
        status: ProgressStatus.COMPLETED,
      },
    })

    const completedPrerequisiteIds = userProgress.map((p) => p.tutorialId)
    const missingPrerequisites = prerequisites.filter((p) => !completedPrerequisiteIds.includes(p.id))

    return {
      canStart: missingPrerequisites.length === 0,
      missingPrerequisites,
    }
  }

  async updateTutorial(id: string, updateDto: Partial<CreateTutorialDto>): Promise<Tutorial> {
    const tutorial = await this.getTutorialById(id)
    Object.assign(tutorial, updateDto)
    return this.tutorialRepository.save(tutorial)
  }

  async deleteTutorial(id: string): Promise<void> {
    const tutorial = await this.getTutorialById(id)
    tutorial.isActive = false
    await this.tutorialRepository.save(tutorial)
  }

  async getTutorialStats(tutorialId: string): Promise<{
    totalUsers: number
    completionRate: number
    averageTime: number
    averageRating: number
    dropoffPoints: Array<{ stepIndex: number; dropoffRate: number }>
  }> {
    const progress = await this.progressRepository.find({
      where: { tutorialId },
    })

    const totalUsers = progress.length
    const completedUsers = progress.filter((p) => p.status === ProgressStatus.COMPLETED).length
    const completionRate = totalUsers > 0 ? (completedUsers / totalUsers) * 100 : 0

    const completedProgress = progress.filter((p) => p.status === ProgressStatus.COMPLETED)
    const averageTime =
      completedProgress.length > 0
        ? completedProgress.reduce((sum, p) => sum + p.timeSpentSeconds, 0) / completedProgress.length
        : 0

    const ratingsProgress = progress.filter((p) => p.feedback?.rating)
    const averageRating =
      ratingsProgress.length > 0
        ? ratingsProgress.reduce((sum, p) => sum + (p.feedback?.rating || 0), 0) / ratingsProgress.length
        : 0

    // Calculate dropoff points
    const tutorial = await this.getTutorialById(tutorialId)
    const dropoffPoints = []

    for (let i = 0; i < tutorial.steps.length; i++) {
      const usersAtStep = progress.filter((p) => p.currentStepIndex >= i).length
      const usersAtNextStep = progress.filter((p) => p.currentStepIndex > i).length
      const dropoffRate = usersAtStep > 0 ? ((usersAtStep - usersAtNextStep) / usersAtStep) * 100 : 0

      dropoffPoints.push({
        stepIndex: i,
        dropoffRate,
      })
    }

    return {
      totalUsers,
      completionRate,
      averageTime,
      averageRating,
      dropoffPoints,
    }
  }

  private async calculateUserLevel(userId: string): Promise<"beginner" | "intermediate" | "advanced"> {
    const completedTutorials = await this.progressRepository.count({
      where: { userId, status: ProgressStatus.COMPLETED },
    })

    if (completedTutorials < 3) return "beginner"
    if (completedTutorials < 10) return "intermediate"
    return "advanced"
  }

  private getAppropriatedifficulties(userLevel: string): TutorialDifficulty[] {
    switch (userLevel) {
      case "beginner":
        return [TutorialDifficulty.BEGINNER]
      case "intermediate":
        return [TutorialDifficulty.BEGINNER, TutorialDifficulty.INTERMEDIATE]
      case "advanced":
        return [TutorialDifficulty.INTERMEDIATE, TutorialDifficulty.ADVANCED]
      default:
        return [TutorialDifficulty.BEGINNER]
    }
  }
}
