import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import {
  GameSession,
  SessionStatus,
  DeviceType,
} from './entities/game-session.entity';
import { CreateGameSessionDto } from './dto/create-game-session.dto';
import { UpdateGameSessionDto } from './dto/update-game-session.dto';

@Injectable()
export class GameSessionService {
  private readonly logger = new Logger(GameSessionService.name);
  private readonly SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes

  constructor(
    @InjectRepository(GameSession)
    private gameSessionRepository: Repository<GameSession>,
  ) {}

  async createSession(
    userId: string,
    createDto: CreateGameSessionDto,
  ): Promise<GameSession> {
    // End any existing active sessions for the user
    await this.endActiveSessions(userId);

    const session = this.gameSessionRepository.create({
      userId,
      startedAt: new Date(),
      ...createDto,
    });

    const savedSession = await this.gameSessionRepository.save(session);
    this.logger.log(
      `Created new session ${savedSession.id} for user ${userId}`,
    );

    return savedSession;
  }

  async getActiveSession(userId: string): Promise<GameSession | null> {
    return this.gameSessionRepository.findOne({
      where: {
        userId,
        status: SessionStatus.ACTIVE,
      },
      relations: ['user'],
    });
  }

  async updateSessionState(
    sessionId: string,
    updateDto: UpdateGameSessionDto,
  ): Promise<GameSession> {
    const session = await this.gameSessionRepository.findOne({
      where: { id: sessionId },
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    // Update session properties
    Object.assign(session, updateDto);

    // Calculate duration if ending session
    if (updateDto.status && updateDto.status !== SessionStatus.ACTIVE) {
      session.endedAt = new Date();
      session.duration =
        (session.endedAt.getTime() - session.startedAt.getTime()) / 1000;
    }

    const updatedSession = await this.gameSessionRepository.save(session);
    this.logger.log(`Updated session ${sessionId} state`);

    return updatedSession;
  }

  async pauseSession(sessionId: string): Promise<GameSession> {
    return this.updateSessionState(sessionId, { status: SessionStatus.PAUSED });
  }

  async resumeSession(sessionId: string): Promise<GameSession> {
    return this.updateSessionState(sessionId, { status: SessionStatus.ACTIVE });
  }

  async endSession(
    sessionId: string,
    status: SessionStatus = SessionStatus.COMPLETED,
  ): Promise<GameSession> {
    return this.updateSessionState(sessionId, { status });
  }

  async recoverSession(sessionId: string): Promise<GameSession> {
    const session = await this.gameSessionRepository.findOne({
      where: { id: sessionId },
      relations: ['user'],
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    // If session was paused, resume it
    if (session.status === SessionStatus.PAUSED) {
      session.status = SessionStatus.ACTIVE;
      await this.gameSessionRepository.save(session);
    }

    return session;
  }

  async getUserSessions(
    userId: string,
    limit: number = 10,
  ): Promise<GameSession[]> {
    return this.gameSessionRepository.find({
      where: { userId },
      order: { startedAt: 'DESC' },
      take: limit,
    });
  }

  async getSessionAnalytics(userId: string): Promise<any> {
    const sessions = await this.gameSessionRepository.find({
      where: { userId },
    });

    const totalSessions = sessions.length;
    const completedSessions = sessions.filter(
      (s) => s.status === SessionStatus.COMPLETED,
    ).length;
    const totalDuration = sessions.reduce(
      (sum, s) => sum + Number(s.duration),
      0,
    );
    const totalScore = sessions.reduce((sum, s) => sum + s.totalScore, 0);
    const totalPuzzlesCompleted = sessions.reduce(
      (sum, s) => sum + s.puzzlesCompleted,
      0,
    );

    const deviceUsage = sessions.reduce(
      (acc, session) => {
        if (session.deviceType) {
          acc[session.deviceType] = (acc[session.deviceType] || 0) + 1;
        }
        return acc;
      },
      {} as Record<DeviceType, number>,
    );

    return {
      totalSessions,
      completedSessions,
      completionRate:
        totalSessions > 0 ? (completedSessions / totalSessions) * 100 : 0,
      totalDuration,
      averageDuration: totalSessions > 0 ? totalDuration / totalSessions : 0,
      totalScore,
      totalPuzzlesCompleted,
      deviceUsage,
    };
  }

  async syncSession(
    sessionId: string,
    deviceType: DeviceType,
  ): Promise<GameSession> {
    const session = await this.gameSessionRepository.findOne({
      where: { id: sessionId },
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    // Update device type for multi-device sync
    session.deviceType = deviceType;
    return this.gameSessionRepository.save(session);
  }

  async exportSession(sessionId: string): Promise<any> {
    const session = await this.gameSessionRepository.findOne({
      where: { id: sessionId },
      relations: ['user'],
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    return {
      sessionId: session.id,
      userId: session.userId,
      status: session.status,
      startedAt: session.startedAt,
      endedAt: session.endedAt,
      duration: session.duration,
      puzzlesAttempted: session.puzzlesAttempted,
      puzzlesCompleted: session.puzzlesCompleted,
      totalScore: session.totalScore,
      experienceGained: session.experienceGained,
      deviceType: session.deviceType,
      sessionData: session.sessionData,
      exportedAt: new Date(),
    };
  }

  async getRecommendations(userId: string): Promise<any> {
    const recentSessions = await this.gameSessionRepository.find({
      where: { userId },
      order: { startedAt: 'DESC' },
      take: 5,
    });

    if (recentSessions.length === 0) {
      return { recommendations: ['Start with beginner puzzles'] };
    }

    const avgScore =
      recentSessions.reduce((sum, s) => sum + s.totalScore, 0) /
      recentSessions.length;
    const completionRate =
      recentSessions.filter((s) => s.status === SessionStatus.COMPLETED)
        .length / recentSessions.length;

    const recommendations = [];

    if (completionRate < 0.5) {
      recommendations.push('Try easier puzzle difficulty levels');
    }
    if (avgScore < 1000) {
      recommendations.push('Practice more basic puzzles to improve your score');
    }
    if (completionRate > 0.8 && avgScore > 2000) {
      recommendations.push('Challenge yourself with harder puzzles');
    }

    return { recommendations, avgScore, completionRate };
  }

  private async endActiveSessions(userId: string): Promise<void> {
    await this.gameSessionRepository.update(
      { userId, status: SessionStatus.ACTIVE },
      { status: SessionStatus.ABANDONED, endedAt: new Date() },
    );
  }

  // Cleanup expired sessions every hour
  @Cron(CronExpression.EVERY_HOUR)
  async cleanupExpiredSessions(): Promise<void> {
    const expiredTime = new Date(Date.now() - this.SESSION_TIMEOUT);

    const expiredSessions = await this.gameSessionRepository.find({
      where: {
        status: SessionStatus.ACTIVE,
        updatedAt: MoreThan(expiredTime),
      },
    });

    if (expiredSessions.length > 0) {
      await this.gameSessionRepository.update(
        { id: expiredSessions.map((s) => s.id) as any },
        { status: SessionStatus.ABANDONED, endedAt: new Date() },
      );

      this.logger.log(`Cleaned up ${expiredSessions.length} expired sessions`);
    }
  }

  // Auto-save active sessions every 5 minutes
  @Cron(CronExpression.EVERY_5_MINUTES)
  async autoSaveActiveSessions(): Promise<void> {
    const activeSessions = await this.gameSessionRepository.find({
      where: { status: SessionStatus.ACTIVE },
    });

    // Update the updatedAt timestamp to indicate session is still active
    if (activeSessions.length > 0) {
      await this.gameSessionRepository.update(
        { status: SessionStatus.ACTIVE },
        { updatedAt: new Date() },
      );

      this.logger.log(`Auto-saved ${activeSessions.length} active sessions`);
    }
  }
}
