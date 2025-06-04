import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere } from 'typeorm';
import { Leaderboard } from './entities/leaderboard.entity';
import { AchievementsService } from '@/Achievement and Progress API Endpoints/achievements/achievements.service';
import { LeaderboardEntry } from './entities/lederboard-entry.entity';

@Injectable()
export class LeaderboardService {
  constructor(
    @InjectRepository(Leaderboard)
    private leaderboardRepo: Repository<Leaderboard>,
    @InjectRepository(LeaderboardEntry)
    private entryRepo: Repository<LeaderboardEntry>,
    @Inject(forwardRef(() => AchievementsService))
    private achievementsService: AchievementsService,
  ) {}

  async getLeaderboard(id: number) {
    return this.leaderboardRepo.findOne({
      where: { id },
      relations: ['entries'],
    });
  }

  async addEntry(leaderboardId: number, entryData: Partial<LeaderboardEntry>) {
    const leaderboard = await this.leaderboardRepo.findOneBy({
      id: leaderboardId,
    });
    const entry = this.entryRepo.create({ ...entryData, leaderboard });
    const savedEntry = await this.entryRepo.save(entry);

    // After saving, check for achievement milestones
    const entries = await this.entryRepo.find({
      where: { leaderboard: { id: leaderboardId } },
      order: {
        score: 'DESC',
        achievedAt: 'ASC',
        userId: 'ASC',
      },
    });

    const rank = entries.findIndex((e) => e.userId === entry.userId) + 1;

    if (rank > 0 && rank <= 10) {
      // Replace 'top_10_leaderboard' with actual achievementId or logic
      await this.achievementsService.updateProgress(
        String(entry.userId),
        'top_10_leaderboard',
        { progress: 100 },
      );
    }

    return savedEntry;
  }

  async getTopEntries(
    leaderboardId: number,
    limit = 10,
    sortBy: 'score' | 'time' | 'efficiency' = 'score',
  ) {
    return this.entryRepo.find({
      where: { leaderboard: { id: leaderboardId } },
      order: { [sortBy]: sortBy === 'time' ? 'ASC' : 'DESC' },
      take: limit,
    });
  }

  async getLeaderboards(
    category?: string,
    period?: string,
    isPublic?: boolean,
  ) {
    const where: FindOptionsWhere<Leaderboard> = {};
    if (category) where.category = category;
    if (period) where.period = period;
    if (typeof isPublic === 'boolean') where.isPublic = isPublic;

    return this.leaderboardRepo.find({ where });
  }

  async getUserRank(
    leaderboardId: number,
    userId: number,
    sortBy: 'score' | 'time' | 'efficiency' = 'score',
  ) {
    // Fetch all entries for the leaderboard, sorted with tie-breakers
    const entries = await this.entryRepo.find({
      where: { leaderboard: { id: leaderboardId } },
      order: {
        [sortBy]: sortBy === 'time' ? 'ASC' : 'DESC',
        achievedAt: 'ASC', // Tie-breaker 1: earliest achievement
        userId: 'ASC', // Tie-breaker 2: lowest userId
      },
    });

    // Find the user's rank (1-based)
    const rank = entries.findIndex((entry) => entry.userId === userId) + 1;

    if (rank === 0) {
      return { rank: null, message: 'User not found in leaderboard' };
    }

    return { rank, total: entries.length };
  }

  async updateVisibility(leaderboardId: number, isPublic: boolean) {
    await this.leaderboardRepo.update({ id: leaderboardId }, { isPublic });
    return { success: true };
  }

  async resetLeaderboard(leaderboardId: number) {
    // Optionally archive entries before deleting
    const entries = await this.entryRepo.find({
      where: { leaderboard: { id: leaderboardId } },
    });

    // Archive logic (if using archive entity)
    // await this.archiveRepo.save(entries.map(e => ({
    //   ...e,
    //   leaderboardId: leaderboardId,
    //   archivedAt: new Date(),
    // })));

    // Delete all entries for this leaderboard
    await this.entryRepo.delete({ leaderboard: { id: leaderboardId } });

    return { success: true, message: 'Leaderboard reset and archived.' };
  }

  async getLeaderboardStats(leaderboardId: number) {
    const [totalEntries, uniqueUsers, avgScore, maxScore, minScore] =
      await Promise.all([
        this.entryRepo.count({ where: { leaderboard: { id: leaderboardId } } }),
        this.entryRepo
          .createQueryBuilder('entry')
          .select('COUNT(DISTINCT entry.userId)', 'count')
          .where('entry.leaderboardId = :leaderboardId', { leaderboardId })
          .getRawOne()
          .then((res) => Number(res.count)),
        this.entryRepo
          .createQueryBuilder('entry')
          .select('AVG(entry.score)', 'avg')
          .where('entry.leaderboardId = :leaderboardId', { leaderboardId })
          .getRawOne()
          .then((res) => Number(res.avg)),
        this.entryRepo
          .createQueryBuilder('entry')
          .select('MAX(entry.score)', 'max')
          .where('entry.leaderboardId = :leaderboardId', { leaderboardId })
          .getRawOne()
          .then((res) => Number(res.max)),
        this.entryRepo
          .createQueryBuilder('entry')
          .select('MIN(entry.score)', 'min')
          .where('entry.leaderboardId = :leaderboardId', { leaderboardId })
          .getRawOne()
          .then((res) => Number(res.min)),
      ]);

    return {
      totalEntries,
      uniqueUsers,
      avgScore,
      maxScore,
      minScore,
    };
  }

  async shareLeaderboardPosition(
    leaderboardId: number,
    userId: number,
    platform?: string,
  ) {
    const leaderboard = await this.leaderboardRepo.findOneBy({
      id: leaderboardId,
    });
    const rankInfo = await this.getUserRank(leaderboardId, userId);

    if (!leaderboard || !rankInfo.rank) {
      return { success: false, message: 'Leaderboard or user not found.' };
    }

    const message = `I'm ranked #${rankInfo.rank} on the "${leaderboard.name}" leaderboard! Can you beat my score?`;

    return {
      success: true,
      message,
      platform: platform || 'generic',
      shareUrl: `https://yourgame.com/leaderboards/${leaderboardId}?user=${userId}`,
    };
  }
}
