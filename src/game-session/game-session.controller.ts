import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  Body,
  Query,
  Request,
} from '@nestjs/common';
import { GameSessionService } from './game-session.service';
import { CreateGameSessionDto } from './dto/create-game-session.dto';
import { UpdateGameSessionDto } from './dto/update-game-session.dto';
import { SessionStatus, DeviceType } from './entities/game-session.entity';
import { AuthRequest } from '@/types/AuthRequest';

@Controller('game-sessions')
export class GameSessionController {
  constructor(private readonly gameSessionService: GameSessionService) {}

  @Post()
  async createSession(
    @Request() req: AuthRequest,
    @Body() createDto: CreateGameSessionDto,
  ) {
    const userId = req.user.id; // Assuming auth guard sets user
    return this.gameSessionService.createSession(userId, createDto);
  }

  @Get('active')
  async getActiveSession(@Request() req: AuthRequest) {
    const userId = req.user.id;
    return this.gameSessionService.getActiveSession(userId);
  }

  @Put(':id/state')
  async updateSessionState(
    @Param('id') sessionId: string,
    @Body() updateDto: UpdateGameSessionDto,
  ) {
    return this.gameSessionService.updateSessionState(sessionId, updateDto);
  }

  @Put(':id/pause')
  async pauseSession(@Param('id') sessionId: string) {
    return this.gameSessionService.pauseSession(sessionId);
  }

  @Put(':id/resume')
  async resumeSession(@Param('id') sessionId: string) {
    return this.gameSessionService.resumeSession(sessionId);
  }

  @Put(':id/end')
  async endSession(
    @Param('id') sessionId: string,
    @Query('status') status: SessionStatus = SessionStatus.COMPLETED,
  ) {
    return this.gameSessionService.endSession(sessionId, status);
  }

  @Get(':id/recover')
  async recoverSession(@Param('id') sessionId: string) {
    return this.gameSessionService.recoverSession(sessionId);
  }

  @Get('history')
  async getUserSessions(
    @Request() req: AuthRequest,
    @Query('limit') limit: number = 10,
  ) {
    const userId = req.user.id;
    return this.gameSessionService.getUserSessions(userId, limit);
  }

  @Get('analytics')
  async getSessionAnalytics(@Request() req: AuthRequest) {
    const userId = req.user.id;
    return this.gameSessionService.getSessionAnalytics(userId);
  }

  @Put(':id/sync')
  async syncSession(
    @Param('id') sessionId: string,
    @Body('deviceType') deviceType: DeviceType,
  ) {
    return this.gameSessionService.syncSession(sessionId, deviceType);
  }

  @Get(':id/export')
  async exportSession(@Param('id') sessionId: string) {
    return this.gameSessionService.exportSession(sessionId);
  }

  @Get('recommendations')
  async getRecommendations(@Request() req: AuthRequest) {
    const userId = req.user.id;
    return this.gameSessionService.getRecommendations(userId);
  }
}
