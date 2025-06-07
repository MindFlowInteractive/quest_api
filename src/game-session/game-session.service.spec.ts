import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException } from '@nestjs/common';
import { GameSessionService } from './game-session.service';
import {
  GameSession,
  SessionStatus,
  DeviceType,
} from './entities/game-session.entity';
import { CreateGameSessionDto } from './dto/create-game-session.dto';
import { UpdateGameSessionDto } from './dto/update-game-session.dto';

describe('GameSessionService', () => {
  let service: GameSessionService;
  let repository: Repository<GameSession>;

  const mockRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    update: jest.fn(),
  };

  const mockGameSession: GameSession = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    userId: 'user-123',
    status: SessionStatus.ACTIVE,
    startedAt: new Date('2024-01-01T10:00:00Z'),
    endedAt: null,
    duration: 0,
    puzzlesAttempted: 0,
    puzzlesCompleted: 0,
    totalScore: 0,
    experienceGained: 0,
    deviceType: DeviceType.DESKTOP,
    userAgent: 'Mozilla/5.0',
    ipAddress: '192.168.1.1',
    sessionData: { gameMode: 'classic' },
    createdAt: new Date('2024-01-01T10:00:00Z'),
    updatedAt: new Date('2024-01-01T10:00:00Z'),
    user: null,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GameSessionService,
        {
          provide: getRepositoryToken(GameSession),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<GameSessionService>(GameSessionService);
    repository = module.get<Repository<GameSession>>(
      getRepositoryToken(GameSession),
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createSession', () => {
    it('should create a new session successfully', async () => {
      const createDto: CreateGameSessionDto = {
        deviceType: DeviceType.DESKTOP,
        userAgent: 'Mozilla/5.0',
        ipAddress: '192.168.1.1',
        sessionData: { gameMode: 'classic' },
      };

      mockRepository.update.mockResolvedValue({ affected: 0 });
      mockRepository.create.mockReturnValue(mockGameSession);
      mockRepository.save.mockResolvedValue(mockGameSession);

      const result = await service.createSession('user-123', createDto);

      expect(mockRepository.update).toHaveBeenCalledWith(
        { userId: 'user-123', status: SessionStatus.ACTIVE },
        { status: SessionStatus.ABANDONED, endedAt: expect.any(Date) },
      );
      expect(mockRepository.create).toHaveBeenCalledWith({
        userId: 'user-123',
        startedAt: expect.any(Date),
        ...createDto,
      });
      expect(mockRepository.save).toHaveBeenCalledWith(mockGameSession);
      expect(result).toEqual(mockGameSession);
    });
  });

  describe('getActiveSession', () => {
    it('should return active session for user', async () => {
      mockRepository.findOne.mockResolvedValue(mockGameSession);

      const result = await service.getActiveSession('user-123');

      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { userId: 'user-123', status: SessionStatus.ACTIVE },
        relations: ['user'],
      });
      expect(result).toEqual(mockGameSession);
    });

    it('should return null if no active session found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      const result = await service.getActiveSession('user-123');

      expect(result).toBeNull();
    });
  });

  describe('updateSessionState', () => {
    it('should update session state successfully', async () => {
      const updateDto: UpdateGameSessionDto = {
        puzzlesCompleted: 5,
        totalScore: 1500,
        status: SessionStatus.ACTIVE,
      };

      const updatedSession = { ...mockGameSession, ...updateDto };
      mockRepository.findOne.mockResolvedValue(mockGameSession);
      mockRepository.save.mockResolvedValue(updatedSession);

      const result = await service.updateSessionState(
        mockGameSession.id,
        updateDto,
      );

      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { id: mockGameSession.id },
      });
      expect(mockRepository.save).toHaveBeenCalledWith(
        expect.objectContaining(updateDto),
      );
      expect(result).toEqual(updatedSession);
    });

    it('should throw NotFoundException if session not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(
        service.updateSessionState('non-existent-id', {}),
      ).rejects.toThrow(NotFoundException);
    });

    it('should calculate duration when ending session', async () => {
      const updateDto: UpdateGameSessionDto = {
        status: SessionStatus.COMPLETED,
      };

      const sessionWithEndTime = {
        ...mockGameSession,
        endedAt: new Date('2024-01-01T11:00:00Z'),
        duration: 3600, // 1 hour in seconds
      };

      mockRepository.findOne.mockResolvedValue(mockGameSession);
      mockRepository.save.mockResolvedValue(sessionWithEndTime);

      const result = await service.updateSessionState(
        mockGameSession.id,
        updateDto,
      );

      expect(result.endedAt).toBeDefined();
      expect(result.duration).toBeGreaterThan(0);
    });
  });

  describe('pauseSession', () => {
    it('should pause session successfully', async () => {
      const pausedSession = {
        ...mockGameSession,
        status: SessionStatus.PAUSED,
      };
      mockRepository.findOne.mockResolvedValue(mockGameSession);
      mockRepository.save.mockResolvedValue(pausedSession);

      const result = await service.pauseSession(mockGameSession.id);

      expect(result.status).toBe(SessionStatus.PAUSED);
    });
  });

  describe('resumeSession', () => {
    it('should resume session successfully', async () => {
      const pausedSession = {
        ...mockGameSession,
        status: SessionStatus.PAUSED,
      };
      const resumedSession = {
        ...mockGameSession,
        status: SessionStatus.ACTIVE,
      };

      mockRepository.findOne.mockResolvedValue(pausedSession);
      mockRepository.save.mockResolvedValue(resumedSession);

      const result = await service.resumeSession(mockGameSession.id);

      expect(result.status).toBe(SessionStatus.ACTIVE);
    });
  });

  describe('getSessionAnalytics', () => {
    it('should return session analytics for user', async () => {
      const sessions = [
        {
          ...mockGameSession,
          status: SessionStatus.COMPLETED,
          duration: 1800,
          totalScore: 1000,
          puzzlesCompleted: 5,
        },
        {
          ...mockGameSession,
          id: 'session-2',
          status: SessionStatus.ABANDONED,
          duration: 600,
          totalScore: 200,
          puzzlesCompleted: 1,
        },
      ];

      mockRepository.find.mockResolvedValue(sessions);

      const result = await service.getSessionAnalytics('user-123');

      expect(result).toEqual({
        totalSessions: 2,
        completedSessions: 1,
        completionRate: 50,
        totalDuration: 2400,
        averageDuration: 1200,
        totalScore: 1200,
        totalPuzzlesCompleted: 6,
        deviceUsage: { [DeviceType.DESKTOP]: 2 },
      });
    });

    it('should handle empty session history', async () => {
      mockRepository.find.mockResolvedValue([]);

      const result = await service.getSessionAnalytics('user-123');

      expect(result.totalSessions).toBe(0);
      expect(result.completionRate).toBe(0);
      expect(result.averageDuration).toBe(0);
    });
  });

  describe('recoverSession', () => {
    it('should recover paused session', async () => {
      const pausedSession = {
        ...mockGameSession,
        status: SessionStatus.PAUSED,
      };
      const recoveredSession = {
        ...mockGameSession,
        status: SessionStatus.ACTIVE,
      };

      mockRepository.findOne.mockResolvedValue(pausedSession);
      mockRepository.save.mockResolvedValue(recoveredSession);

      const result = await service.recoverSession(mockGameSession.id);

      expect(mockRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: SessionStatus.ACTIVE }),
      );
      expect(result.status).toBe(SessionStatus.ACTIVE);
    });

    it('should throw NotFoundException if session not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.recoverSession('non-existent-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('exportSession', () => {
    it('should export session data successfully', async () => {
      mockRepository.findOne.mockResolvedValue(mockGameSession);

      const result = await service.exportSession(mockGameSession.id);

      expect(result).toEqual({
        sessionId: mockGameSession.id,
        userId: mockGameSession.userId,
        status: mockGameSession.status,
        startedAt: mockGameSession.startedAt,
        endedAt: mockGameSession.endedAt,
        duration: mockGameSession.duration,
        puzzlesAttempted: mockGameSession.puzzlesAttempted,
        puzzlesCompleted: mockGameSession.puzzlesCompleted,
        totalScore: mockGameSession.totalScore,
        experienceGained: mockGameSession.experienceGained,
        deviceType: mockGameSession.deviceType,
        sessionData: mockGameSession.sessionData,
        exportedAt: expect.any(Date),
      });
    });
  });

  describe('getRecommendations', () => {
    it('should return recommendations for new user', async () => {
      mockRepository.find.mockResolvedValue([]);

      const result = await service.getRecommendations('user-123');

      expect(result.recommendations).toContain('Start with beginner puzzles');
    });

    it('should return performance-based recommendations', async () => {
      const sessions = [
        {
          ...mockGameSession,
          status: SessionStatus.COMPLETED,
          totalScore: 500,
        },
        {
          ...mockGameSession,
          status: SessionStatus.ABANDONED,
          totalScore: 300,
        },
      ];

      mockRepository.find.mockResolvedValue(sessions);

      const result = await service.getRecommendations('user-123');

      expect(result.avgScore).toBe(400);
      expect(result.completionRate).toBe(0.5);
      expect(result.recommendations).toBeDefined();
    });
  });
});
