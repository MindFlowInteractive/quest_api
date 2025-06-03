import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, MoreThan, LessThan } from 'typeorm';
import { UserProgress, SkillLevel } from './entities/user-progress.entity';
import { Achievement, AchievementType } from './entities/achievement.entity';
import { UserAchievement } from './entities/user-achievement.entity';
import {
  ProgressSnapshot,
  SnapshotType,
} from './entities/progress-snapshot.entity';
import { User } from '../user/entities/user.entity';
import { CreateProgressDto } from './dto/create-progress.dto';
import { UpdateProgressDto } from './dto/update-progress.dto';
import { ProgressFilterDto } from './dto/progress-filter.dto';
import { AchievementFilterDto } from './dto/achievement-filter.dto';
import { ProgressUpdateActivityDto } from './dto/progress-update-activity.dto';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class UserProgressService {
  private readonly logger = new Logger(UserProgressService.name);

  constructor(
    @InjectRepository(UserProgress)
    private progressRepository: Repository<UserProgress>,
    @InjectRepository(Achievement)
    private achievementRepository: Repository<Achievement>,
    @InjectRepository(UserAchievement)
    private userAchievementRepository: Repository<UserAchievement>,
    @InjectRepository(ProgressSnapshot)
    private snapshotRepository: Repository<ProgressSnapshot>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async createUserProgress(
    createProgressDto: CreateProgressDto,
  ): Promise<UserProgress> {
    const user = await this.userRepository.findOne({
      where: { id: createProgressDto.userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const existingProgress = await this.progressRepository.findOne({
      where: { userId: createProgressDto.userId },
    });

    if (existingProgress) {
      throw new BadRequestException('User progress already exists');
    }

    const progress = this.progressRepository.create({
      ...createProgressDto,
      user,
      lastActiveDate: new Date(),
    });

    const savedProgress = await this.progressRepository.save(progress);
    await this.createSnapshot(
      savedProgress,
      SnapshotType.MILESTONE,
      'Initial progress created',
    );

    return savedProgress;
  }

  async getUserProgress(userId: string): Promise<UserProgress> {
    const progress = await this.progressRepository.findOne({
      where: { userId },
      relations: [
        'user',
        'achievements',
        'achievements.achievement',
        'snapshots',
      ],
    });

    if (!progress) {
      // Auto-create progress if it doesn't exist
      return this.createUserProgress({ userId });
    }

    return progress;
  }

  async updateProgress(
    userId: string,
    updateDto: UpdateProgressDto,
  ): Promise<UserProgress> {
    const progress = await this.getUserProgress(userId);

    // Update basic statistics
    if (updateDto.puzzlesAttemptedIncrement) {
      progress.totalPuzzlesAttempted += updateDto.puzzlesAttemptedIncrement;
    }

    if (updateDto.puzzlesCompletedIncrement) {
      progress.totalPuzzlesCompleted += updateDto.puzzlesCompletedIncrement;
    }

    if (updateDto.puzzlesSolvedIncrement) {
      progress.totalPuzzlesSolved += updateDto.puzzlesSolvedIncrement;
    }

    if (updateDto.timeSpentIncrement) {
      progress.totalTimeSpent += updateDto.timeSpentIncrement;
    }

    if (updateDto.experiencePointsIncrement) {
      progress.experiencePoints += updateDto.experiencePointsIncrement;
    }

    if (updateDto.hintsUsedIncrement) {
      progress.totalHintsUsed += updateDto.hintsUsedIncrement;
    }

    if (updateDto.perfectSolvesIncrement) {
      progress.perfectSolves += updateDto.perfectSolvesIncrement;
    }

    // Update category stats
    if (updateDto.categoryStatsUpdate) {
      progress.categoryStats = {
        ...progress.categoryStats,
        ...updateDto.categoryStatsUpdate,
      };
    }

    // Update difficulty stats
    if (updateDto.difficultyStatsUpdate) {
      progress.difficultyStats = {
        ...progress.difficultyStats,
        ...updateDto.difficultyStatsUpdate,
      };
    }

    // Recalculate derived statistics
    progress.overallSuccessRate = this.calculateSuccessRate(progress);
    progress.averageCompletionTime =
      this.calculateAverageCompletionTime(progress);
    progress.currentLevel = this.calculateLevel(progress.experiencePoints);
    progress.pointsToNextLevel = this.calculatePointsToNextLevel(
      progress.experiencePoints,
    );

    // Update skill level if provided or auto-calculate
    if (updateDto.currentSkillLevel) {
      progress.currentSkillLevel = updateDto.currentSkillLevel;
    } else {
      progress.currentSkillLevel = this.calculateSkillLevel(progress);
    }

    progress.lastActiveDate = new Date();

    const savedProgress = await this.progressRepository.save(progress);

    // Check for achievement unlocks
    await this.checkAndUnlockAchievements(userId);

    return savedProgress;
  }

  async updateProgressFromActivity(
    userId: string,
    activityDto: ProgressUpdateActivityDto,
  ): Promise<UserProgress> {
    const progress = await this.getUserProgress(userId);
    const today = new Date().toISOString().split('T')[0];

    // Update basic counters
    progress.totalPuzzlesAttempted += 1;
    progress.totalTimeSpent += activityDto.timeSpent;

    if (activityDto.completed) {
      progress.totalPuzzlesCompleted += 1;
    }

    if (activityDto.solved) {
      progress.totalPuzzlesSolved += 1;
      progress.experiencePoints += this.calculateExperiencePoints(activityDto);
    }

    if (activityDto.hintsUsed) {
      progress.totalHintsUsed += activityDto.hintsUsed;
    }

    if (activityDto.solved && !activityDto.hintsUsed) {
      progress.perfectSolves += 1;
    }

    // Update difficulty stats
    const diffKey = activityDto.difficulty;
    if (!progress.difficultyStats[diffKey]) {
      progress.difficultyStats[diffKey] = {
        attempted: 0,
        completed: 0,
        solved: 0,
        averageTime: 0,
      };
    }

    progress.difficultyStats[diffKey].attempted += 1;
    if (activityDto.completed) progress.difficultyStats[diffKey].completed += 1;
    if (activityDto.solved) progress.difficultyStats[diffKey].solved += 1;

    // Update average time for difficulty
    const currentAvg = progress.difficultyStats[diffKey].averageTime;
    const completedCount = progress.difficultyStats[diffKey].completed;
    progress.difficultyStats[diffKey].averageTime =
      (currentAvg * (completedCount - 1) + activityDto.timeSpent) /
      completedCount;

    // Update category stats if category provided
    if (activityDto.categoryId) {
      if (!progress.categoryStats[activityDto.categoryId]) {
        progress.categoryStats[activityDto.categoryId] = {
          attempted: 0,
          completed: 0,
          solved: 0,
          averageTime: 0,
          successRate: 0,
        };
      }

      const catStats = progress.categoryStats[activityDto.categoryId];
      catStats.attempted += 1;
      if (activityDto.completed) catStats.completed += 1;
      if (activityDto.solved) catStats.solved += 1;

      catStats.averageTime =
        (catStats.averageTime * (catStats.completed - 1) +
          activityDto.timeSpent) /
        catStats.completed;
      catStats.successRate = (catStats.solved / catStats.attempted) * 100;
    }

    // Update daily activity
    if (!progress.dailyActivity[today]) {
      progress.dailyActivity[today] = {
        puzzlesAttempted: 0,
        puzzlesCompleted: 0,
        puzzlesSolved: 0,
        timeSpent: 0,
        perfectSolves: 0,
      };
    }

    progress.dailyActivity[today].puzzlesAttempted += 1;
    progress.dailyActivity[today].timeSpent += activityDto.timeSpent;
    if (activityDto.completed)
      progress.dailyActivity[today].puzzlesCompleted += 1;
    if (activityDto.solved) progress.dailyActivity[today].puzzlesSolved += 1;
    if (activityDto.solved && !activityDto.hintsUsed)
      progress.dailyActivity[today].perfectSolves += 1;

    // Update streaks
    await this.updateStreaks(progress);

    // Update ratings average
    if (activityDto.ratingGiven) {
      const totalRatings = progress.totalPuzzlesCompleted;
      progress.averageRatingGiven =
        (progress.averageRatingGiven * (totalRatings - 1) +
          activityDto.ratingGiven) /
        totalRatings;
    }

    // Recalculate derived statistics
    progress.overallSuccessRate = this.calculateSuccessRate(progress);
    progress.averageCompletionTime =
      this.calculateAverageCompletionTime(progress);
    progress.currentLevel = this.calculateLevel(progress.experiencePoints);
    progress.pointsToNextLevel = this.calculatePointsToNextLevel(
      progress.experiencePoints,
    );
    progress.currentSkillLevel = this.calculateSkillLevel(progress);
    progress.lastActiveDate = new Date();

    const savedProgress = await this.progressRepository.save(progress);

    // Check for achievement unlocks
    await this.checkAndUnlockAchievements(userId);

    return savedProgress;
  }

  async getAllProgress(
    filterDto: ProgressFilterDto,
  ): Promise<{ data: UserProgress[]; total: number }> {
    const { page = 1, limit = 20, ...filters } = filterDto;
    const skip = (page - 1) * limit;

    const queryBuilder = this.progressRepository
      .createQueryBuilder('progress')
      .leftJoinAndSelect('progress.user', 'user')
      .leftJoinAndSelect('progress.achievements', 'userAchievements')
      .leftJoinAndSelect('userAchievements.achievement', 'achievement');

    if (filters.skillLevel) {
      queryBuilder.andWhere('progress.currentSkillLevel = :skillLevel', {
        skillLevel: filters.skillLevel,
      });
    }

    if (filters.minExperiencePoints) {
      queryBuilder.andWhere('progress.experiencePoints >= :minExp', {
        minExp: filters.minExperiencePoints,
      });
    }

    if (filters.maxExperiencePoints) {
      queryBuilder.andWhere('progress.experiencePoints <= :maxExp', {
        maxExp: filters.maxExperiencePoints,
      });
    }

    if (filters.minLevel) {
      queryBuilder.andWhere('progress.currentLevel >= :minLevel', {
        minLevel: filters.minLevel,
      });
    }

    if (filters.maxLevel) {
      queryBuilder.andWhere('progress.currentLevel <= :maxLevel', {
        maxLevel: filters.maxLevel,
      });
    }

    if (filters.activeSince) {
      queryBuilder.andWhere('progress.lastActiveDate >= :activeSince', {
        activeSince: filters.activeSince,
      });
    }

    const [data, total] = await queryBuilder
      .skip(skip)
      .take(limit)
      .orderBy('progress.experiencePoints', 'DESC')
      .getManyAndCount();

    return { data, total };
  }

  // Achievement Management
  async createAchievement(
    achievementData: Partial<Achievement>,
  ): Promise<Achievement> {
    const achievement = this.achievementRepository.create(achievementData);
    return this.achievementRepository.save(achievement);
  }

  async getAchievements(
    filterDto: AchievementFilterDto,
  ): Promise<Achievement[]> {
    const queryBuilder =
      this.achievementRepository.createQueryBuilder('achievement');

    if (filterDto.type) {
      queryBuilder.andWhere('achievement.type = :type', {
        type: filterDto.type,
      });
    }

    if (filterDto.rarity) {
      queryBuilder.andWhere('achievement.rarity = :rarity', {
        rarity: filterDto.rarity,
      });
    }

    if (filterDto.activeOnly) {
      queryBuilder.andWhere('achievement.isActive = :active', { active: true });
    }

    return queryBuilder.getMany();
  }

  async getUserAchievements(
    userId: string,
    filterDto?: AchievementFilterDto,
  ): Promise<UserAchievement[]> {
    const queryBuilder = this.userAchievementRepository
      .createQueryBuilder('userAchievement')
      .leftJoinAndSelect('userAchievement.achievement', 'achievement')
      .where('userAchievement.userId = :userId', { userId });

    if (filterDto?.unlocked !== undefined) {
      queryBuilder.andWhere('userAchievement.isUnlocked = :unlocked', {
        unlocked: filterDto.unlocked,
      });
    }

    if (filterDto?.type) {
      queryBuilder.andWhere('achievement.type = :type', {
        type: filterDto.type,
      });
    }

    if (filterDto?.rarity) {
      queryBuilder.andWhere('achievement.rarity = :rarity', {
        rarity: filterDto.rarity,
      });
    }

    return queryBuilder.getMany();
  }

  async checkAndUnlockAchievements(userId: string): Promise<UserAchievement[]> {
    const progress = await this.getUserProgress(userId);
    const achievements = await this.getAchievements({ activeOnly: true });
    const unlockedAchievements: UserAchievement[] = [];

    for (const achievement of achievements) {
      const userAchievement = await this.userAchievementRepository.findOne({
        where: { userId, achievementId: achievement.id },
      });

      if (!userAchievement || userAchievement.isUnlocked) {
        continue;
      }

      const isUnlocked = this.evaluateAchievementCriteria(
        achievement,
        progress,
      );

      if (isUnlocked) {
        userAchievement.isUnlocked = true;
        userAchievement.unlockedAt = new Date();
        userAchievement.progress = 100;

        await this.userAchievementRepository.save(userAchievement);
        unlockedAchievements.push(userAchievement);

        // Update achievement unlock count
        achievement.totalUnlocked += 1;
        await this.achievementRepository.save(achievement);

        // Add achievement points to user's progress
        progress.experiencePoints += achievement.points;
        progress.totalAchievements += 1;
      } else {
        // Update progress percentage
        const progressPercentage = this.calculateAchievementProgress(
          achievement,
          progress,
        );
        userAchievement.progress = progressPercentage;
        await this.userAchievementRepository.save(userAchievement);
      }
    }

    if (unlockedAchievements.length > 0) {
      await this.progressRepository.save(progress);
    }

    return unlockedAchievements;
  }

  // Leaderboard and Rankings
  async getLeaderboard(
    type: 'experience' | 'level' | 'streak' = 'experience',
    limit: number = 50,
  ): Promise<UserProgress[]> {
    const orderField =
      type === 'experience'
        ? 'experiencePoints'
        : type === 'level'
          ? 'currentLevel'
          : 'currentDailyStreak';

    return this.progressRepository.find({
      relations: ['user'],
      order: { [orderField]: 'DESC' },
      take: limit,
    });
  }

  async getUserRank(
    userId: string,
    type: 'experience' | 'level' | 'streak' = 'experience',
  ): Promise<number> {
    const progress = await this.getUserProgress(userId);
    const field =
      type === 'experience'
        ? 'experiencePoints'
        : type === 'level'
          ? 'currentLevel'
          : 'currentDailyStreak';

    const rank = await this.progressRepository
      .createQueryBuilder('progress')
      .where(`progress.${field} > :value`, { value: progress[field] })
      .getCount();

    return rank + 1;
  }

  // Progress Snapshots and Backup
  async createSnapshot(
    progress: UserProgress,
    type: SnapshotType,
    notes?: string,
  ): Promise<ProgressSnapshot> {
    const snapshot = this.snapshotRepository.create({
      userId: progress.userId,
      userProgress: progress,
      type,
      snapshotDate: new Date(),
      notes,
      data: {
        totalPuzzlesCompleted: progress.totalPuzzlesCompleted,
        totalPuzzlesSolved: progress.totalPuzzlesSolved,
        experiencePoints: progress.experiencePoints,
        currentLevel: progress.currentLevel,
        currentDailyStreak: progress.currentDailyStreak,
        difficultyStats: progress.difficultyStats,
        categoryStats: progress.categoryStats,
        achievements: progress.totalAchievements,
        timeSpent: progress.totalTimeSpent,
      },
    });

    return this.snapshotRepository.save(snapshot);
  }

  async getProgressHistory(
    userId: string,
    days: number = 30,
  ): Promise<ProgressSnapshot[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    return this.snapshotRepository.find({
      where: {
        userId,
        snapshotDate: MoreThan(startDate),
      },
      order: { snapshotDate: 'ASC' },
    });
  }

  async backupProgress(userId: string): Promise<any> {
    const progress = await this.getUserProgress(userId);
    const achievements = await this.getUserAchievements(userId);
    const snapshots = await this.getProgressHistory(userId, 365);

    const backupData = {
      progress,
      achievements,
      snapshots,
      backupDate: new Date(),
    };

    progress.backupData = backupData;
    progress.lastBackupDate = new Date();
    await this.progressRepository.save(progress);

    return backupData;
  }

  async restoreProgress(
    userId: string,
    backupData: any,
  ): Promise<UserProgress> {
    const progress = await this.getUserProgress(userId);

    // Restore progress data (selective restore to avoid conflicts)
    Object.assign(progress, {
      ...backupData.progress,
      id: progress.id,
      userId: progress.userId,
      user: progress.user,
      updatedAt: new Date(),
    });

    await this.progressRepository.save(progress);
    await this.createSnapshot(
      progress,
      SnapshotType.BACKUP,
      'Data restored from backup',
    );

    return progress;
  }

  // Analytics and Recommendations
  async getProgressAnalytics(userId: string): Promise<any> {
    const progress = await this.getUserProgress(userId);
    const history = await this.getProgressHistory(userId, 30);

    return {
      currentStats: {
        level: progress.currentLevel,
        experiencePoints: progress.experiencePoints,
        completionRate: progress.completionRate,
        solveRate: progress.solveRate,
        averageTime: progress.averageTimePerPuzzle,
        streak: progress.currentDailyStreak,
      },
      trends: this.calculateTrends(history),
      recommendations: await this.generateRecommendations(progress),
      strengths: progress.strongAreas,
      weaknesses: progress.weakAreas,
    };
  }

  generateRecommendations(progress: UserProgress): Promise<string[]> {
    const recommendations: string[] = [];

    // Check difficulty balance
    const diffStats = progress.difficultyStats;
    const totalAttempted = Object.values(diffStats).reduce(
      (sum, stat) => sum + stat.attempted,
      0,
    );

    if (totalAttempted > 0) {
      const easyPercentage = (diffStats.easy.attempted / totalAttempted) * 100;
      const hardPercentage =
        ((diffStats.hard.attempted + diffStats.expert.attempted) /
          totalAttempted) *
        100;

      if (easyPercentage > 60) {
        recommendations.push(
          'Try more challenging puzzles to improve your skills',
        );
      }

      if (hardPercentage < 20 && progress.currentLevel > 5) {
        recommendations.push(
          'Challenge yourself with harder difficulty puzzles',
        );
      }
    }

    // Check streak maintenance
    if (progress.currentDailyStreak === 0) {
      recommendations.push('Start a daily puzzle streak to build consistency');
    } else if (progress.currentDailyStreak < progress.longestDailyStreak / 2) {
      recommendations.push('Focus on maintaining your daily streak');
    }

    // Check category diversity
    const categoryCount = Object.keys(progress.categoryStats).length;
    if (categoryCount < 3) {
      recommendations.push(
        'Explore different puzzle categories to broaden your skills',
      );
    }

    return recommendations;
  }

  // Scheduled Tasks
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async createDailySnapshots(): Promise<void> {
    this.logger.log('Creating daily snapshots for all users');

    const activeUsers = await this.progressRepository.find({
      where: {
        lastActiveDate: MoreThan(
          new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        ),
      },
    });

    for (const progress of activeUsers) {
      await this.createSnapshot(progress, SnapshotType.DAILY);
    }

    this.logger.log(`Created daily snapshots for ${activeUsers.length} users`);
  }

  @Cron(CronExpression.EVERY_DAY_AT_1AM)
  async updateStreaks(): Promise<void> {
    this.logger.log('Updating streaks for all users');

    const allProgress = await this.progressRepository.find();

    for (const progress of allProgress) {
      await this.updateStreaks(progress);
      await this.progressRepository.save(progress);
    }

    this.logger.log(`Updated streaks for ${allProgress.length} users`);
  }

  @Cron(CronExpression.EVERY_WEEK)
  async updateRankings(): Promise<void> {
    this.logger.log('Updating global rankings');

    const allProgress = await this.progressRepository.find({
      order: { experiencePoints: 'DESC' },
    });

    for (let i = 0; i < allProgress.length; i++) {
      allProgress[i].globalRank = i + 1;
    }

    await this.progressRepository.save(allProgress);
    this.logger.log(`Updated rankings for ${allProgress.length} users`);
  }

  // Helper Methods
  private calculateSuccessRate(progress: UserProgress): number {
    return progress.totalPuzzlesAttempted > 0
      ? (progress.totalPuzzlesSolved / progress.totalPuzzlesAttempted) * 100
      : 0;
  }

  private calculateAverageCompletionTime(progress: UserProgress): number {
    return progress.totalPuzzlesCompleted > 0
      ? progress.totalTimeSpent / progress.totalPuzzlesCompleted
      : 0;
  }

  private calculateLevel(experiencePoints: number): number {
    // Level formula: level = floor(sqrt(experiencePoints / 100)) + 1
    return Math.floor(Math.sqrt(experiencePoints / 100)) + 1;
  }

  private calculatePointsToNextLevel(experiencePoints: number): number {
    const currentLevel = this.calculateLevel(experiencePoints);
    const pointsForNextLevel = Math.pow(currentLevel, 2) * 100;
    return pointsForNextLevel - experiencePoints;
  }

  private calculateSkillLevel(progress: UserProgress): SkillLevel {
    const level = progress.currentLevel;
    const successRate = progress.overallSuccessRate;

    if (level >= 50 && successRate >= 90) return SkillLevel.MASTER;
    if (level >= 30 && successRate >= 80) return SkillLevel.EXPERT;
    if (level >= 15 && successRate >= 70) return SkillLevel.ADVANCED;
    if (level >= 5 && successRate >= 50) return SkillLevel.INTERMEDIATE;
    return SkillLevel.BEGINNER;
  }

  private calculateExperiencePoints(
    activity: ProgressUpdateActivityDto,
  ): number {
    let points = 0;

    if (activity.solved) {
      // Base points for solving
      points += 10;

      // Difficulty multiplier
      const multipliers = { easy: 1, medium: 1.5, hard: 2, expert: 3 };
      points *= multipliers[activity.difficulty] || 1;

      // Perfect solve bonus
      if (!activity.hintsUsed) {
        points += 5;
      }

      // Speed bonus (if completed in less than average time)
      // This would require additional logic to determine average time
    }

    return Math.round(points);
  }

  // private updateStreaks(progress: UserProgress): Promise<void> {
  //   const today = new Date();
  //   const yesterday = new Date(today);
  //   yesterday.setDate(yesterday.getDate() - 1);

  //   const todayStr = today.toISOString().split('T')[0];
  //   const yesterdayStr = yesterday.toISOString().split('T')[0];

  //   const todayActivity = progress.dailyActivity[todayStr];
  //   const yesterdayActivity = progress.dailyActivity[yesterdayStr];

  //   // Check if user was active today
  //   if (todayActivity && todayActivity.puzzlesSolved > 0) {
  //     if (!progress.isActiveToday) {
  //       // First activity today
  //       if (yesterdayActivity && yesterdayActivity.puzzlesSolved > 0) {
  //         // Continue streak
  //         progress.currentDailyStreak += 1;
  //       } else {
  //         // Start new streak
  //         progress.currentDailyStreak = 1;
  //         progress.streakStartDate = today;
  //       }

  //       // Update longest streak
  //       if (progress.currentDailyStreak > progress.longestDailyStreak) {
  //         progress.longestDailyStreak = progress.currentDailyStreak;
  //       }
  //     }
  //   } else if (!todayActivity || todayActivity.puzzlesSolved === 0) {
  //     // No activity today, check if streak should be broken
  //     const lastActiveDate = progress.lastActiveDate;
  //     if (lastActiveDate) {
  //       const daysSinceActive = Math.floor(
  //         (today.getTime() - lastActiveDate.getTime()) / (1000 * 60 * 60 * 24),
  //       );
  //       if (daysSinceActive > 1) {
  //         progress.currentDailyStreak = 0;
  //       }
  //     }
  //   }
  // }

  private evaluateAchievementCriteria(
    achievement: Achievement,
    progress: UserProgress,
  ): boolean {
    const { criteria } = achievement;
    const value = this.getProgressValue(progress, criteria.field);

    switch (criteria.comparison) {
      case 'gte':
        return value >= criteria.value;
      case 'lte':
        return value <= criteria.value;
      case 'eq':
        return value === criteria.value;
      case 'gt':
        return value > criteria.value;
      case 'lt':
        return value < criteria.value;
      default:
        return false;
    }
  }

  private calculateAchievementProgress(
    achievement: Achievement,
    progress: UserProgress,
  ): number {
    const { criteria } = achievement;
    const currentValue = this.getProgressValue(progress, criteria.field);
    const targetValue = criteria.value;

    return Math.min(100, (currentValue / targetValue) * 100);
  }

  private getProgressValue(progress: UserProgress, field: string): number {
    // Handle nested field access for complex criteria
    if (field.includes('.')) {
      const parts = field.split('.');
      let value = progress as any;
      for (const part of parts) {
        value = value[part];
        if (value === undefined) return 0;
      }
      return value;
    }

    return (progress as any)[field] || 0;
  }

  private calculateTrends(snapshots: ProgressSnapshot[]): any {
    if (snapshots.length < 2) return null;

    const latest = snapshots[snapshots.length - 1];
    const previous = snapshots[0];

    return {
      experiencePointsChange:
        latest.data.experiencePoints - previous.data.experiencePoints,
      levelChange: latest.data.currentLevel - previous.data.currentLevel,
      completionRateChange: this.calculateCompletionRateChange(snapshots),
      streakChange:
        latest.data.currentDailyStreak - previous.data.currentDailyStreak,
    };
  }

  private calculateCompletionRateChange(snapshots: ProgressSnapshot[]): number {
    // Implementation for calculating completion rate trend
    return 0; // Placeholder
  }
}
