import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, In } from 'typeorm';
import { Achievement, AchievementType } from './entities/achievement.entity';
import { UserAchievement, ProgressStatus } from './entities/user-achievement.entity';
import { AchievementNotification, NotificationType } from './entities/achievement-notification.entity';
import { CreateAchievementDto } from './dto/create-achievement.dto';
import { UpdateProgressDto } from './dto/update-progress.dto';
import { ShareAchievementDto } from './dto/share-achievement.dto';
import { AchievementFilterDto } from './dto/achievement-filter.dto';

@Injectable()
export class AchievementsService {
  constructor(
    @InjectRepository(Achievement)
    private achievementRepository: Repository<Achievement>,
    @InjectRepository(UserAchievement)
    private userAchievementRepository: Repository<UserAchievement>,
    @InjectRepository(AchievementNotification)
    private notificationRepository: Repository<AchievementNotification>,
  ) {}

  async createAchievement(createAchievementDto: CreateAchievementDto): Promise<Achievement> {
    const achievement = this.achievementRepository.create(createAchievementDto);
    return await this.achievementRepository.save(achievement);
  }

  async getAllAchievements(filters: AchievementFilterDto): Promise<Achievement[]> {
    const queryBuilder = this.achievementRepository.createQueryBuilder('achievement');

    if (filters.type) {
      queryBuilder.andWhere('achievement.type = :type', { type: filters.type });
    }

    if (filters.rarity) {
      queryBuilder.andWhere('achievement.rarity = :rarity', { rarity: filters.rarity });
    }

    if (filters.isHidden !== undefined) {
      queryBuilder.andWhere('achievement.isHidden = :isHidden', { isHidden: filters.isHidden });
    }

    if (filters.search) {
      queryBuilder.andWhere(
        '(achievement.name ILIKE :search OR achievement.description ILIKE :search)',
        { search: `%${filters.search}%` }
      );
    }

    const sortBy = filters.sortBy || 'createdAt';
    const sortOrder = filters.sortOrder || 'DESC';
    queryBuilder.orderBy(`achievement.${sortBy}`, sortOrder);

    return await queryBuilder.getMany();
  }

  async getAchievementById(id: string): Promise<Achievement> {
    const achievement = await this.achievementRepository.findOne({
      where: { id },
      relations: ['userAchievements']
    });

    if (!achievement) {
      throw new NotFoundException('Achievement not found');
    }

    return achievement;
  }

  async getUserAchievements(userId: string, filters: AchievementFilterDto): Promise<UserAchievement[]> {
    const queryBuilder = this.userAchievementRepository
      .createQueryBuilder('userAchievement')
      .leftJoinAndSelect('userAchievement.achievement', 'achievement')
      .where('userAchievement.userId = :userId', { userId });

    if (filters.status) {
      queryBuilder.andWhere('userAchievement.status = :status', { status: filters.status });
    }

    if (filters.type) {
      queryBuilder.andWhere('achievement.type = :type', { type: filters.type });
    }

    if (filters.rarity) {
      queryBuilder.andWhere('achievement.rarity = :rarity', { rarity: filters.rarity });
    }

    return await queryBuilder.getMany();
  }

  async updateProgress(userId: string, achievementId: string, updateProgressDto: UpdateProgressDto): Promise<UserAchievement> {
    let userAchievement = await this.userAchievementRepository.findOne({
      where: { userId, achievementId },
      relations: ['achievement']
    });

    if (!userAchievement) {
      const achievement = await this.getAchievementById(achievementId);
      userAchievement = this.userAchievementRepository.create({
        userId,
        achievementId,
        achievement,
        status: ProgressStatus.IN_PROGRESS
      });
    }

    userAchievement.progress = updateProgressDto.progress;
    userAchievement.progressData = updateProgressDto.progressData || userAchievement.progressData;

    // Check if achievement is completed
    if (updateProgressDto.progress >= 100 && userAchievement.status !== ProgressStatus.COMPLETED) {
      userAchievement.status = ProgressStatus.COMPLETED;
      userAchievement.unlockedAt = new Date();
      
      // Create unlock notification
      await this.createNotification(userId, achievementId, NotificationType.UNLOCK, 
        `Congratulations! You've unlocked the "${userAchievement.achievement.name}" achievement!`);
    } else if (updateProgressDto.progress > 0 && userAchievement.status === ProgressStatus.NOT_STARTED) {
      userAchievement.status = ProgressStatus.IN_PROGRESS;
    }

    return await this.userAchievementRepository.save(userAchievement);
  }

  async shareAchievement(userId: string, achievementId: string, shareDto: ShareAchievementDto): Promise<{ success: boolean; shareUrl: string }> {
    const userAchievement = await this.userAchievementRepository.findOne({
      where: { userId, achievementId, status: ProgressStatus.COMPLETED },
      relations: ['achievement']
    });

    if (!userAchievement) {
      throw new BadRequestException('Achievement not unlocked or not found');
    }

    userAchievement.sharedAt = new Date();
    await this.userAchievementRepository.save(userAchievement);

    // Create share notification
    await this.createNotification(userId, achievementId, NotificationType.SHARE,
      `You shared the "${userAchievement.achievement.name}" achievement on ${shareDto.platform}!`);

    // Generate share URL (mock implementation)
    const shareUrl = `https://yourapp.com/achievements/shared/${userAchievement.id}`;

    return { success: true, shareUrl };
  }

  async getProgressStatistics(userId: string): Promise<any> {
    const stats = await this.userAchievementRepository
      .createQueryBuilder('ua')
      .leftJoin('ua.achievement', 'a')
      .select([
        'COUNT(*) as total',
        'COUNT(CASE WHEN ua.status = :completed THEN 1 END) as completed',
        'COUNT(CASE WHEN ua.status = :inProgress THEN 1 END) as inProgress',
        'SUM(CASE WHEN ua.status = :completed THEN a.points ELSE 0 END) as totalPoints',
        'AVG(ua.progress) as averageProgress'
      ])
      .where('ua.userId = :userId', { userId })
      .setParameter('completed', ProgressStatus.COMPLETED)
      .setParameter('inProgress', ProgressStatus.IN_PROGRESS)
      .getRawOne();

    const rarityStats = await this.userAchievementRepository
      .createQueryBuilder('ua')
      .leftJoin('ua.achievement', 'a')
      .select(['a.rarity', 'COUNT(*) as count'])
      .where('ua.userId = :userId AND ua.status = :completed', { userId, completed: ProgressStatus.COMPLETED })
      .groupBy('a.rarity')
      .getRawMany();

    return {
      total: parseInt(stats.total) || 0,
      completed: parseInt(stats.completed) || 0,
      inProgress: parseInt(stats.inProgress) || 0,
      totalPoints: parseInt(stats.totalpoints) || 0,
      averageProgress: parseFloat(stats.averageprogress) || 0,
      completionRate: stats.total > 0 ? (stats.completed / stats.total) * 100 : 0,
      rarityBreakdown: rarityStats.reduce((acc, curr) => {
        acc[curr.rarity] = parseInt(curr.count);
        return acc;
      }, {})
    };
  }

  async getLeaderboard(achievementId?: string, limit: number = 10): Promise<any[]> {
    let queryBuilder = this.userAchievementRepository
      .createQueryBuilder('ua')
      .leftJoin('ua.achievement', 'a')
      .select([
        'ua.userId',
        'COUNT(CASE WHEN ua.status = :completed THEN 1 END) as completedCount',
        'SUM(CASE WHEN ua.status = :completed THEN a.points ELSE 0 END) as totalPoints'
      ])
      .where('ua.status = :completed', { completed: ProgressStatus.COMPLETED })
      .groupBy('ua.userId')
      .orderBy('totalPoints', 'DESC')
      .limit(limit);

    if (achievementId) {
      queryBuilder = this.userAchievementRepository
        .createQueryBuilder('ua')
        .select(['ua.userId', 'ua.unlockedAt'])
        .where('ua.achievementId = :achievementId AND ua.status = :completed', 
          { achievementId, completed: ProgressStatus.COMPLETED })
        .orderBy('ua.unlockedAt', 'ASC')
        .limit(limit);
    }

    return await queryBuilder.getRawMany();
  }

  async getAchievementHints(userId: string, achievementId: string): Promise<{ hint: string; guidance: string[] }> {
    const achievement = await this.getAchievementById(achievementId);
    const userAchievement = await this.userAchievementRepository.findOne({
      where: { userId, achievementId }
    });

    const progress = userAchievement?.progress || 0;
    const guidance = this.generateGuidance(achievement, progress);

    return {
      hint: achievement.hint || 'No hint available',
      guidance
    };
  }

  async performRetroactiveCheck(userId: string): Promise<UserAchievement[]> {
    const retroactiveAchievements = await this.achievementRepository.find({
      where: { isRetroactive: true, isActive: true }
    });

    const results = [];

    for (const achievement of retroactiveAchievements) {
      const existingProgress = await this.userAchievementRepository.findOne({
        where: { userId, achievementId: achievement.id }
      });

      if (!existingProgress || existingProgress.status !== ProgressStatus.COMPLETED) {
        // Mock retroactive progress calculation
        const calculatedProgress = await this.calculateRetroactiveProgress(userId, achievement);
        
        if (calculatedProgress > 0) {
          const result = await this.updateProgress(userId, achievement.id, {
            progress: calculatedProgress
          });
          results.push(result);
        }
      }
    }

    return results;
  }

  async exportUserAchievements(userId: string, format: 'json' | 'csv' = 'json'): Promise<any> {
    const userAchievements = await this.userAchievementRepository.find({
      where: { userId },
      relations: ['achievement']
    });

    const data = userAchievements.map(ua => ({
      achievementName: ua.achievement.name,
      description: ua.achievement.description,
      type: ua.achievement.type,
      rarity: ua.achievement.rarity,
      status: ua.status,
      progress: ua.progress,
      points: ua.achievement.points,
      unlockedAt: ua.unlockedAt,
      createdAt: ua.createdAt
    }));

    if (format === 'csv') {
      // Convert to CSV format
      const headers = Object.keys(data[0] || {}).join(',');
      const rows = data.map(row => Object.values(row).join(','));
      return `${headers}\n${rows.join('\n')}`;
    }

    return data;
  }

  async customizeAchievement(userId: string, achievementId: string, customization: Record<string, any>): Promise<UserAchievement> {
    const userAchievement = await this.userAchievementRepository.findOne({
      where: { userId, achievementId }
    });

    if (!userAchievement) {
      throw new NotFoundException('User achievement not found');
    }

    userAchievement.customization = { ...userAchievement.customization, ...customization };
    return await this.userAchievementRepository.save(userAchievement);
  }

  async getNotifications(userId: string, limit: number = 20): Promise<AchievementNotification[]> {
    return await this.notificationRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: limit
    });
  }

  private async createNotification(userId: string, achievementId: string, type: NotificationType, message: string, data?: any): Promise<void> {
    const notification = this.notificationRepository.create({
      userId,
      achievementId,
      type,
      message,
      data
    });
    await this.notificationRepository.save(notification);
  }

  private generateGuidance(achievement: Achievement, progress: number): string[] {
    const guidance = [];

    if (progress < 25) {
      guidance.push('You\'re just getting started! Focus on the basic requirements.');
    } else if (progress < 50) {
      guidance.push('Good progress! You\'re a quarter of the way there.');
    } else if (progress < 75) {
      guidance.push('Great work! You\'re more than halfway to unlocking this achievement.');
    } else if (progress < 100) {
      guidance.push('Almost there! Just a little more effort needed.');
    }

    // Add specific guidance based on achievement type
    switch (achievement.type) {
      case AchievementType.STREAK:
        guidance.push('Maintain consistency to build your streak.');
        break;
      case AchievementType.COLLECTION:
        guidance.push('Explore different areas to complete your collection.');
        break;
      case AchievementType.MILESTONE:
        guidance.push('Reach the target milestone to unlock this achievement.');
        break;
    }

    return guidance;
  }

  private async calculateRetroactiveProgress(userId: string, achievement: Achievement): Promise<number> {
    // Mock implementation - in reality, this would analyze user's historical data
    // based on the achievement criteria
    return Math.floor(Math.random() * 100);
  }
}
