import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  HttpStatus,
  ParseUUIDPipe,
  ValidationPipe,
  HttpCode,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';
import { UserProgressService } from './user-progress.service';
import { UserProgress } from './entities/user-progress.entity';
import { Achievement } from './entities/achievement.entity';
import { UserAchievement } from './entities/user-achievement.entity';
import { ProgressSnapshot } from './entities/progress-snapshot.entity';
import { CreateProgressDto } from './dto/create-progress.dto';
import { UpdateProgressDto } from './dto/update-progress.dto';
import { ProgressFilterDto } from './dto/progress-filter.dto';
import { AchievementFilterDto } from './dto/achievement-filter.dto';
import { ProgressUpdateActivityDto } from './dto/progress-update-activity.dto';

@ApiTags('User Progress')
@Controller('user-progress')
@ApiBearerAuth()
export class UserProgressController {
  constructor(private readonly userProgressService: UserProgressService) {}

  @Post()
  @ApiOperation({ summary: 'Create user progress tracking' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'User progress tracking created successfully',
    type: UserProgress,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'User progress already exists or invalid data',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'User not found',
  })
  async createUserProgress(
    @Body(ValidationPipe) createProgressDto: CreateProgressDto,
  ): Promise<UserProgress> {
    return this.userProgressService.createUserProgress(createProgressDto);
  }

  @Get(':userId')
  @ApiOperation({ summary: 'Get user progress by user ID' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User progress retrieved successfully',
    type: UserProgress,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'User progress not found',
  })
  async getUserProgress(
    @Param('userId', ParseUUIDPipe) userId: string,
  ): Promise<UserProgress> {
    return this.userProgressService.getUserProgress(userId);
  }

  @Put(':userId')
  @ApiOperation({ summary: 'Update user progress' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User progress updated successfully',
    type: UserProgress,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'User progress not found',
  })
  async updateProgress(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body(ValidationPipe) updateProgressDto: UpdateProgressDto,
  ): Promise<UserProgress> {
    return this.userProgressService.updateProgress(userId, updateProgressDto);
  }

  @Post(':userId/activity')
  @ApiOperation({ summary: 'Update progress from puzzle activity' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiBody({ type: ProgressUpdateActivityDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Progress updated from activity successfully',
    type: UserProgress,
  })
  @HttpCode(HttpStatus.OK)
  async updateProgressFromActivity(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body(ValidationPipe) activityDto: ProgressUpdateActivityDto,
  ): Promise<UserProgress> {
    return this.userProgressService.updateProgressFromActivity(
      userId,
      activityDto,
    );
  }

  @Get()
  @ApiOperation({ summary: 'Get all user progress with filtering' })
  @ApiQuery({ type: ProgressFilterDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User progress list retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'array',
          items: { $ref: '#/components/schemas/UserProgress' },
        },
        total: { type: 'number' },
        page: { type: 'number' },
        limit: { type: 'number' },
        totalPages: { type: 'number' },
      },
    },
  })
  async getAllProgress(
    @Query(ValidationPipe) filterDto: ProgressFilterDto,
  ): Promise<{
    data: UserProgress[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const result = await this.userProgressService.getAllProgress(filterDto);
    const totalPages = Math.ceil(result.total / filterDto.limit);

    return {
      ...result,
      page: filterDto.page,
      limit: filterDto.limit,
      totalPages,
    };
  }

  // Achievement Endpoints
  @Post('achievements')
  @ApiOperation({ summary: 'Create a new achievement' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Achievement created successfully',
    type: Achievement,
  })
  async createAchievement(
    @Body() achievementData: Partial<Achievement>,
  ): Promise<Achievement> {
    return this.userProgressService.createAchievement(achievementData);
  }

  @Get('achievements')
  @ApiOperation({ summary: 'Get all achievements with filtering' })
  @ApiQuery({ type: AchievementFilterDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Achievements retrieved successfully',
    type: [Achievement],
  })
  async getAchievements(
    @Query(ValidationPipe) filterDto: AchievementFilterDto,
  ): Promise<Achievement[]> {
    return this.userProgressService.getAchievements(filterDto);
  }

  @Get(':userId/achievements')
  @ApiOperation({ summary: 'Get user achievements' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiQuery({ type: AchievementFilterDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User achievements retrieved successfully',
    type: [UserAchievement],
  })
  async getUserAchievements(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Query(ValidationPipe) filterDto?: AchievementFilterDto,
  ): Promise<UserAchievement[]> {
    return this.userProgressService.getUserAchievements(userId, filterDto);
  }

  @Post(':userId/achievements/check')
  @ApiOperation({ summary: 'Check and unlock achievements for user' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Achievements checked and unlocked',
    type: [UserAchievement],
  })
  @HttpCode(HttpStatus.OK)
  async checkAndUnlockAchievements(
    @Param('userId', ParseUUIDPipe) userId: string,
  ): Promise<UserAchievement[]> {
    return this.userProgressService.checkAndUnlockAchievements(userId);
  }

  // Leaderboard Endpoints
  @Get('leaderboard/:type')
  @ApiOperation({ summary: 'Get leaderboard by type' })
  @ApiParam({
    name: 'type',
    enum: ['experience', 'level', 'streak'],
    description: 'Leaderboard type',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Number of top users to return (default: 50, max: 100)',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Leaderboard retrieved successfully',
    type: [UserProgress],
  })
  async getLeaderboard(
    @Param('type') type: 'experience' | 'level' | 'streak',
    @Query('limit') limit?: number,
  ): Promise<UserProgress[]> {
    const validTypes = ['experience', 'level', 'streak'];
    if (!validTypes.includes(type)) {
      throw new BadRequestException(
        'Invalid leaderboard type. Must be one of: experience, level, streak',
      );
    }

    const maxLimit = Math.min(limit || 50, 100);
    return this.userProgressService.getLeaderboard(type, maxLimit);
  }

  @Get(':userId/rank/:type')
  @ApiOperation({ summary: 'Get user rank by type' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiParam({
    name: 'type',
    enum: ['experience', 'level', 'streak'],
    description: 'Ranking type',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User rank retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        userId: { type: 'string' },
        type: { type: 'string' },
        rank: { type: 'number' },
      },
    },
  })
  async getUserRank(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Param('type') type: 'experience' | 'level' | 'streak',
  ): Promise<{ userId: string; type: string; rank: number }> {
    const validTypes = ['experience', 'level', 'streak'];
    if (!validTypes.includes(type)) {
      throw new BadRequestException(
        'Invalid ranking type. Must be one of: experience, level, streak',
      );
    }

    const rank = await this.userProgressService.getUserRank(userId, type);
    return { userId, type, rank };
  }

  // Progress History and Snapshots
  @Get(':userId/history')
  @ApiOperation({ summary: 'Get user progress history' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiQuery({
    name: 'days',
    required: false,
    type: Number,
    description: 'Number of days to look back (default: 30)',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Progress history retrieved successfully',
    type: [ProgressSnapshot],
  })
  async getProgressHistory(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Query('days') days?: number,
  ): Promise<ProgressSnapshot[]> {
    const lookbackDays = Math.min(days || 30, 365); // Max 1 year
    return this.userProgressService.getProgressHistory(userId, lookbackDays);
  }

  @Post(':userId/snapshot')
  @ApiOperation({ summary: 'Create progress snapshot' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        type: {
          type: 'string',
          enum: ['daily', 'weekly', 'monthly', 'milestone', 'backup'],
        },
        notes: { type: 'string' },
      },
      required: ['type'],
    },
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Progress snapshot created successfully',
    type: ProgressSnapshot,
  })
  async createSnapshot(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body() snapshotData: { type: string; notes?: string },
  ): Promise<ProgressSnapshot> {
    const progress = await this.userProgressService.getUserProgress(userId);
    return this.userProgressService.createSnapshot(
      progress,
      snapshotData.type as any,
      snapshotData.notes,
    );
  }

  // Backup and Restore
  @Post(':userId/backup')
  @ApiOperation({ summary: 'Create progress backup' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Progress backup created successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string' },
        backupId: { type: 'string' },
        backupDate: { type: 'string', format: 'date-time' },
      },
    },
  })
  @HttpCode(HttpStatus.OK)
  async backupProgress(
    @Param('userId', ParseUUIDPipe) userId: string,
  ): Promise<{ message: string; backupId: string; backupDate: Date }> {
    const backupData = await this.userProgressService.backupProgress(userId);
    return {
      message: 'Progress backup created successfully',
      backupId: `backup-${userId}-${Date.now()}`,
      backupDate: backupData.backupDate,
    };
  }

  @Post(':userId/restore')
  @ApiOperation({ summary: 'Restore progress from backup' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiBody({
    description: 'Backup data to restore',
    schema: { type: 'object' },
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Progress restored successfully',
    type: UserProgress,
  })
  @HttpCode(HttpStatus.OK)
  async restoreProgress(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body() backupData: any,
  ): Promise<UserProgress> {
    return this.userProgressService.restoreProgress(userId, backupData);
  }

  // Analytics and Insights
  @Get(':userId/analytics')
  @ApiOperation({ summary: 'Get user progress analytics and insights' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Progress analytics retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        currentStats: {
          type: 'object',
          properties: {
            level: { type: 'number' },
            experiencePoints: { type: 'number' },
            completionRate: { type: 'number' },
            solveRate: { type: 'number' },
            averageTime: { type: 'number' },
            streak: { type: 'number' },
          },
        },
        trends: { type: 'object' },
        recommendations: { type: 'array', items: { type: 'string' } },
        strengths: { type: 'array', items: { type: 'string' } },
        weaknesses: { type: 'array', items: { type: 'string' } },
      },
    },
  })
  async getProgressAnalytics(
    @Param('userId', ParseUUIDPipe) userId: string,
  ): Promise<any> {
    return this.userProgressService.getProgressAnalytics(userId);
  }

  @Get(':userId/recommendations')
  @ApiOperation({ summary: 'Get personalized puzzle recommendations' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Number of recommendations to return (default: 10)',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Recommendations retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        puzzleIds: { type: 'array', items: { type: 'string' } },
        reasons: { type: 'array', items: { type: 'string' } },
        categories: { type: 'array', items: { type: 'string' } },
      },
    },
  })
  async getRecommendations(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Query('limit') limit?: number,
  ): Promise<{
    puzzleIds: string[];
    reasons: string[];
    categories: string[];
  }> {
    const progress = await this.userProgressService.getUserProgress(userId);
    const maxLimit = Math.min(limit || 10, 50);

    return {
      puzzleIds: progress.recommendedPuzzles.slice(0, maxLimit),
      reasons: await this.userProgressService.generateRecommendations(progress),
      categories: progress.weakAreas.slice(0, 5),
    };
  }

  // Statistics Endpoints
  @Get(':userId/stats/summary')
  @ApiOperation({ summary: 'Get user progress summary statistics' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Progress summary retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        totalPuzzles: { type: 'number' },
        completionRate: { type: 'number' },
        averageTime: { type: 'number' },
        currentStreak: { type: 'number' },
        level: { type: 'number' },
        achievements: { type: 'number' },
        rank: { type: 'number' },
      },
    },
  })
  async getProgressSummary(
    @Param('userId', ParseUUIDPipe) userId: string,
  ): Promise<any> {
    const progress = await this.userProgressService.getUserProgress(userId);
    const rank = await this.userProgressService.getUserRank(
      userId,
      'experience',
    );

    return {
      totalPuzzles: progress.totalPuzzlesAttempted,
      completionRate: progress.completionRate,
      averageTime: progress.averageTimePerPuzzle,
      currentStreak: progress.currentDailyStreak,
      level: progress.currentLevel,
      achievements: progress.totalAchievements,
      rank,
    };
  }

  @Get(':userId/stats/difficulty')
  @ApiOperation({ summary: 'Get user statistics by difficulty' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Difficulty statistics retrieved successfully',
  })
  async getDifficultyStats(
    @Param('userId', ParseUUIDPipe) userId: string,
  ): Promise<any> {
    const progress = await this.userProgressService.getUserProgress(userId);
    return progress.difficultyStats;
  }

  @Get(':userId/stats/category')
  @ApiOperation({ summary: 'Get user statistics by category' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Category statistics retrieved successfully',
  })
  async getCategoryStats(
    @Param('userId', ParseUUIDPipe) userId: string,
  ): Promise<any> {
    const progress = await this.userProgressService.getUserProgress(userId);
    return progress.categoryStats;
  }

  @Get(':userId/stats/activity')
  @ApiOperation({ summary: 'Get user activity statistics' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiQuery({
    name: 'period',
    required: false,
    enum: ['daily', 'weekly', 'monthly'],
    description: 'Activity period (default: daily)',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Activity statistics retrieved successfully',
  })
  async getActivityStats(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Query('period') period: 'daily' | 'weekly' | 'monthly' = 'daily',
  ): Promise<any> {
    const progress = await this.userProgressService.getUserProgress(userId);

    switch (period) {
      case 'weekly':
        return progress.weeklyActivity;
      case 'monthly':
        return progress.monthlyActivity;
      default:
        return progress.dailyActivity;
    }
  }
}
