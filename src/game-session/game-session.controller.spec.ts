import { Test, TestingModule } from '@nestjs/testing';
import { GameSessionController } from './game-session.controller';
import { GameSessionService } from './game-session.service';
import { CreateGameSessionDto } from './dto/create-game-session.dto';
import { UpdateGameSessionDto } from './dto/update-game-session.dto';
import { SessionStatus, DeviceType } from './entities/game-session.entity';

describe('GameSessionController', () => {
  let controller: GameSessionController;
  let service: GameSessionService;

  const mockGameSessionService = {
    createSession: jest.fn(),
    getActiveSession: jest.fn(),
    updateSessionState: jest.fn(),
    pauseSession: jest.fn(),
    resumeSession: jest.fn(),
    endSession: jest.fn(),
    recoverSession: jest.fn(),
    getUserSessions: jest.fn(),
    getSessionAnalytics: jest.fn(),
    syncSession: jest.fn(),
    exportSession: jest.fn(),
    getRecommendations: jest.fn(),
  };

  const mockRequest = {
    user: { id: 'user-123' },
  };

  const mockGameSession = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    userId: 'user-123',
    status: SessionStatus.ACTIVE,
    startedAt: new Date(),
    deviceType: DeviceType.DESKTOP,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [GameSessionController],
      providers: [
        {
          provide: GameSessionService,
          useValue: mockGameSessionService,
        },
      ],
    }).compile();

    controller = module.get<GameSessionController>(GameSessionController);
    service = module.get<GameSessionService>(GameSessionService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createSession', () => {
    it('should create a new session', async () => {
      const createDto: CreateGameSessionDto = {
        deviceType: DeviceType.DESKTOP,
        userAgent: 'Mozilla/5.0',
      };

      mockGameSessionService.createSession.mockResolvedValue(mockGameSession);

      const result = await controller.createSession(mockRequest, createDto);

      expect(mockGameSessionService.createSession).toHaveBeenCalledWith(
        'user-123',
        createDto,
      );
      expect(result).toEqual(mockGameSession);
    });
  });

  describe('getActiveSession', () => {
    it('should get active session for user', async () => {
      mockGameSessionService.getActiveSession.mockResolvedValue(
        mockGameSession,
      );

      const result = await controller.getActiveSession(mockRequest);

      expect(mockGameSessionService.getActiveSession).toHaveBeenCalledWith(
        'user-123',
      );
      expect(result).toEqual(mockGameSession);
    });
  });

  describe('updateSessionState', () => {
    it('should update session state', async () => {
      const updateDto: UpdateGameSessionDto = {
        puzzlesCompleted: 5,
        totalScore: 1500,
      };

      const updatedSession = { ...mockGameSession, ...updateDto };
      mockGameSessionService.updateSessionState.mockResolvedValue(
        updatedSession,
      );

      const result = await controller.updateSessionState(
        mockGameSession.id,
        updateDto,
      );

      expect(mockGameSessionService.updateSessionState).toHaveBeenCalledWith(
        mockGameSession.id,
        updateDto,
      );
      expect(result).toEqual(updatedSession);
    });
  });

  describe('pauseSession', () => {
    it('should pause session', async () => {
      const pausedSession = {
        ...mockGameSession,
        status: SessionStatus.PAUSED,
      };
      mockGameSessionService.pauseSession.mockResolvedValue(pausedSession);

      const result = await controller.pauseSession(mockGameSession.id);

      expect(mockGameSessionService.pauseSession).toHaveBeenCalledWith(
        mockGameSession.id,
      );
      expect(result).toEqual(pausedSession);
    });
  });

  describe('resumeSession', () => {
    it('should resume session', async () => {
      mockGameSessionService.resumeSession.mockResolvedValue(mockGameSession);

      const result = await controller.resumeSession(mockGameSession.id);

      expect(mockGameSessionService.resumeSession).toHaveBeenCalledWith(
        mockGameSession.id,
      );
      expect(result).toEqual(mockGameSession);
    });
  });

  describe('endSession', () => {
    it('should end session with default status', async () => {
      const completedSession = {
        ...mockGameSession,
        status: SessionStatus.COMPLETED,
      };
      mockGameSessionService.endSession.mockResolvedValue(completedSession);

      const result = await controller.endSession(mockGameSession.id);

      expect(mockGameSessionService.endSession).toHaveBeenCalledWith(
        mockGameSession.id,
        SessionStatus.COMPLETED,
      );
      expect(result).toEqual(completedSession);
    });

    it('should end session with custom status', async () => {
      const abandonedSession = {
        ...mockGameSession,
        status: SessionStatus.ABANDONED,
      };
      mockGameSessionService.endSession.mockResolvedValue(abandonedSession);

      const result = await controller.endSession(
        mockGameSession.id,
        SessionStatus.ABANDONED,
      );

      expect(mockGameSessionService.endSession).toHaveBeenCalledWith(
        mockGameSession.id,
        SessionStatus.ABANDONED,
      );
      expect(result).toEqual(abandonedSession);
    });
  });

  describe('recoverSession', () => {
    it('should recover session', async () => {
      mockGameSessionService.recoverSession.mockResolvedValue(mockGameSession);

      const result = await controller.recoverSession(mockGameSession.id);

      expect(mockGameSessionService.recoverSession).toHaveBeenCalledWith(
        mockGameSession.id,
      );
      expect(result).toEqual(mockGameSession);
    });
  });

  describe('getUserSessions', () => {
    it('should get user sessions with default limit', async () => {
      const sessions = [mockGameSession];
      mockGameSessionService.getUserSessions.mockResolvedValue(sessions);

      const result = await controller.getUserSessions(mockRequest);

      expect(mockGameSessionService.getUserSessions).toHaveBeenCalledWith(
        'user-123',
        10,
      );
      expect(result).toEqual(sessions);
    });

    it('should get user sessions with custom limit', async () => {
      const sessions = [mockGameSession];
      mockGameSessionService.getUserSessions.mockResolvedValue(sessions);

      const result = await controller.getUserSessions(mockRequest, 5);

      expect(mockGameSessionService.getUserSessions).toHaveBeenCalledWith(
        'user-123',
        5,
      );
      expect(result).toEqual(sessions);
    });
  });

  describe('getSessionAnalytics', () => {
    it('should get session analytics', async () => {
      const analytics = {
        totalSessions: 10,
        completedSessions: 8,
        completionRate: 80,
        totalScore: 15000,
      };

      mockGameSessionService.getSessionAnalytics.mockResolvedValue(analytics);

      const result = await controller.getSessionAnalytics(mockRequest);

      expect(mockGameSessionService.getSessionAnalytics).toHaveBeenCalledWith(
        'user-123',
      );
      expect(result).toEqual(analytics);
    });
  });

  describe('syncSession', () => {
    it('should sync session with device type', async () => {
      const syncedSession = {
        ...mockGameSession,
        deviceType: DeviceType.MOBILE,
      };
      mockGameSessionService.syncSession.mockResolvedValue(syncedSession);

      const result = await controller.syncSession(
        mockGameSession.id,
        DeviceType.MOBILE,
      );

      expect(mockGameSessionService.syncSession).toHaveBeenCalledWith(
        mockGameSession.id,
        DeviceType.MOBILE,
      );
      expect(result).toEqual(syncedSession);
    });
  });

  describe('exportSession', () => {
    it('should export session', async () => {
      const exportedData = {
        sessionId: mockGameSession.id,
        userId: mockGameSession.userId,
        exportedAt: new Date(),
      };

      mockGameSessionService.exportSession.mockResolvedValue(exportedData);

      const result = await controller.exportSession(mockGameSession.id);

      expect(mockGameSessionService.exportSession).toHaveBeenCalledWith(
        mockGameSession.id,
      );
      expect(result).toEqual(exportedData);
    });
  });

  describe('getRecommendations', () => {
    it('should get recommendations', async () => {
      const recommendations = {
        recommendations: ['Try harder puzzles'],
        avgScore: 1500,
        completionRate: 0.8,
      };

      mockGameSessionService.getRecommendations.mockResolvedValue(
        recommendations,
      );

      const result = await controller.getRecommendations(mockRequest);

      expect(mockGameSessionService.getRecommendations).toHaveBeenCalledWith(
        'user-123',
      );
      expect(result).toEqual(recommendations);
    });
  });
});
